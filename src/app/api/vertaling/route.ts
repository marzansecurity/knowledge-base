import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { vereisRedacteurOfHoger } from '@/lib/auth';
import { VERTAAL_SCHEMA, vertaalSysteemprompt } from '@/lib/prompt';
import { isTaal, STANDAARD_TAAL } from '@/lib/talen';

type ModelVertaling = {
  titel: string;
  samenvatting: string;
  inhoud_markdown: string;
  slug: string;
};

/**
 * Genereert een CONCEPT-vertaling van een artikel. Slaat bewust niets op: de
 * redacteur ziet het resultaat eerst in de editor en bewaart het daar zelf,
 * zodat er nooit ongecontroleerde tekst in de kennisbank belandt.
 */
export async function POST(request: Request) {
  // Zelfde rechtenlat als de rest van het artikelbeheer.
  const { supabase } = await vereisRedacteurOfHoger();

  const body = await request.json().catch(() => null);
  const articleId = String(body?.articleId ?? '').trim();
  const doelTaal = body?.doelTaal;

  if (!articleId) {
    return NextResponse.json({ fout: 'Geen artikel opgegeven.' }, { status: 400 });
  }
  if (!isTaal(doelTaal) || doelTaal === STANDAARD_TAAL) {
    return NextResponse.json(
      { fout: 'Kies een geldige doeltaal; het Nederlands is de brontaal.' },
      { status: 400 },
    );
  }

  // De Nederlandse versie is de bron van waarheid.
  const { data: bron, error: leesFout } = await supabase
    .from('article_translations')
    .select('title, summary, content_markdown')
    .eq('article_id', articleId)
    .eq('locale', STANDAARD_TAAL)
    .maybeSingle();

  if (leesFout) return NextResponse.json({ fout: leesFout.message }, { status: 500 });
  if (!bron) return NextResponse.json({ fout: 'Artikel niet gevonden.' }, { status: 404 });
  if (!bron.content_markdown.trim()) {
    return NextResponse.json({ fout: 'Dit artikel heeft nog geen inhoud om te vertalen.' }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let response;
  try {
    response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL!,
      max_tokens: 8192,
      system: [{ type: 'text', text: vertaalSysteemprompt(doelTaal) }],
      messages: [
        {
          role: 'user',
          content: [
            `Titel: ${bron.title}`,
            `Samenvatting: ${bron.summary ?? ''}`,
            '',
            'Inhoud:',
            bron.content_markdown,
          ].join('\n'),
        },
      ],
      output_config: { format: VERTAAL_SCHEMA, effort: 'medium' },
    });
  } catch (e) {
    return NextResponse.json(
      { fout: e instanceof Error ? e.message : 'De vertaaldienst is niet bereikbaar.' },
      { status: 502 },
    );
  }

  const tekstBlok = response.content.find((b) => b.type === 'text');
  let vertaling: ModelVertaling | null = null;
  try {
    vertaling = tekstBlok ? JSON.parse(tekstBlok.text) : null;
  } catch {
    vertaling = null;
  }

  if (!vertaling?.titel || !vertaling.inhoud_markdown) {
    return NextResponse.json({ fout: 'De vertaling kwam onvolledig terug. Probeer het opnieuw.' }, { status: 502 });
  }

  return NextResponse.json({
    titel: vertaling.titel,
    samenvatting: vertaling.samenvatting || null,
    inhoud_markdown: vertaling.inhoud_markdown,
    slug: vertaling.slug,
  });
}
