import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { bouwKennisbank } from '@/lib/kennisbank';
import { haalToegankelijkeCategorieIds } from '@/lib/toegang';
import { ANTWOORD_SCHEMA, ESCALATIE_TEKST, systeempromptVast } from '@/lib/prompt';
import { isTaal, STANDAARD_TAAL, type Taal } from '@/lib/talen';

type ModelAntwoord = {
  antwoord: string;
  bronnen: string[];
  escaleren: boolean;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: 'Niet ingelogd.' }, { status: 401 });

  const { data: profiel } = await supabase
    .from('profiles')
    .select('active, role')
    .eq('user_id', user.id)
    .single();
  if (!profiel?.active) return NextResponse.json({ fout: 'Dit account is niet actief.' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const vraag = String(body?.vraag ?? '').trim();
  if (!vraag) return NextResponse.json({ fout: 'Geen vraag opgegeven.' }, { status: 400 });

  // De client kent zijn taal uit het routesegment en stuurt hem mee. Het body-veld
  // is `any`, dus eerst naar string dwingen voordat isTaal kan versmallen.
  const taalUitBody = String(body?.taal ?? '');
  const taal: Taal = isTaal(taalUitBody) ? taalUitBody : STANDAARD_TAAL;

  let conversationId: string | undefined = body?.conversationId || undefined;

  if (!conversationId) {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: vraag.slice(0, 80) })
      .select('id')
      .single();
    if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
    conversationId = data.id;
  } else {
    const { data: gesprek } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!gesprek) return NextResponse.json({ fout: 'Gesprek niet gevonden.' }, { status: 404 });
  }

  const { error: insertFout } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role: 'user', content: vraag });
  if (insertFout) return NextResponse.json({ fout: insertFout.message }, { status: 500 });

  const { data: geschiedenis, error: geschiedenisFout } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at');
  if (geschiedenisFout) return NextResponse.json({ fout: geschiedenisFout.message }, { status: 500 });

  let toegestaneCategorieIds: Set<string> | null = null;
  if (profiel.role !== 'admin') {
    toegestaneCategorieIds = await haalToegankelijkeCategorieIds(supabase, user.id);
    if (toegestaneCategorieIds) {
      // "Start hier" is voor iedereen bedoeld, ook wanneer de kennisbank verder is afgeschermd.
      const { data: startHier } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', 'start-hier')
        .maybeSingle();
      if (startHier) toegestaneCategorieIds.add(startHier.id);
    }
  }

  const kennisbank = await bouwKennisbank(supabase, { taal, toegestaneCategorieIds });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let response;
  try {
    response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL!,
      max_tokens: 4096,
      system: [
        { type: 'text', text: systeempromptVast(taal) },
        {
          type: 'text',
          text: `KENNISBANK — ${kennisbank.aantalArtikelen} gepubliceerde artikelen:\n\n${kennisbank.systeemblok}`,
          cache_control: { type: 'ephemeral', ttl: '1h' },
        },
      ],
      messages: (geschiedenis ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      output_config: { format: ANTWOORD_SCHEMA, effort: 'medium' },
    });
  } catch (e) {
    return NextResponse.json(
      { fout: e instanceof Error ? e.message : 'De AI-assistent is niet bereikbaar.' },
      { status: 502 },
    );
  }

  const tekstBlok = response.content.find((b) => b.type === 'text');
  let geparsed: ModelAntwoord | null = null;
  try {
    geparsed = tekstBlok ? JSON.parse(tekstBlok.text) : null;
  } catch {
    geparsed = null;
  }

  const escaleren = geparsed?.escaleren ?? true;
  const geldigeBronnen = (geparsed?.bronnen ?? []).filter((id) => kennisbank.artikelen.has(id));

  // Nooit gokken: een antwoord zonder controleerbare bron is altijd een escalatie,
  // ook als het model zelf escaleren=false teruggaf. En de escalatietekst is vast —
  // het model formuleert zijn eigen escalatiebericht niet, want dat kan zelf weer
  // een aanname bevatten die niet uit de kennisbank komt (bijv. "vraag het aan HR").
  const moetEscaleren = escaleren || geldigeBronnen.length === 0;
  const antwoord = moetEscaleren ? ESCALATIE_TEKST[taal] : (geparsed!.antwoord ?? ESCALATIE_TEKST[taal]);
  const bronnenDetails = moetEscaleren ? [] : geldigeBronnen.map((id) => kennisbank.artikelen.get(id)!);

  const { data: opgeslagenBericht, error: berichtFout } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: antwoord,
      cited_article_ids: moetEscaleren ? [] : geldigeBronnen,
      escalated: moetEscaleren,
      origin_question: vraag,
    })
    .select('id')
    .single();
  if (berichtFout) return NextResponse.json({ fout: berichtFout.message }, { status: 500 });

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return NextResponse.json({
    conversationId,
    berichtId: opgeslagenBericht.id,
    antwoord,
    escaleren: moetEscaleren,
    bronnen: bronnenDetails,
  });
}
