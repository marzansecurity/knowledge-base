import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { bouwKennisbank, type KennisbankArtikel } from '@/lib/kennisbank';
import { haalToegankelijkeCategorieIds } from '@/lib/toegang';
import {
  ANTWOORD_SCHEMA,
  ESCALATIE_IN_GESCHIEDENIS,
  ESCALATIE_TEKST,
  systeempromptVast,
} from '@/lib/prompt';
import { isTaal, STANDAARD_TAAL, type Taal } from '@/lib/talen';

/**
 * Het antwoord komt via server-sent events binnen. Niet omdat het antwoord zelf
 * stukje bij beetje getoond wordt — dat mag niet, want een antwoord zonder
 * geldige bron wordt achteraf verworpen en moet de medewerker dus nooit al
 * gelezen hebben — maar omdat het model tijdens het nadenken vertelt waar het
 * mee bezig is. Die voortgang gaat wél direct naar het scherm. Daarmee is de
 * stilte weg zonder dat de harde bronregel sneuvelt.
 */
export const maxDuration = 60;

type ModelAntwoord = {
  uitkomst: 'antwoord' | 'verduidelijking' | 'escalatie';
  antwoord: string;
  bronnen: string[];
  dichtbij: string[];
};

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const stuur = (event: string, data: unknown) => {
        if (!open) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const faal = (fout: string, status = 500) => {
        stuur('fout', { fout, status });
        open = false;
        controller.close();
      };

      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return faal('Niet ingelogd.', 401);

        const body = await request.json().catch(() => null);
        const vraag = String(body?.vraag ?? '').trim();
        if (!vraag) return faal('Geen vraag opgegeven.', 400);

        // De client kent zijn taal uit het routesegment en stuurt hem mee. Het
        // body-veld is `any`, dus eerst naar string dwingen voordat isTaal kan
        // versmallen.
        const taalUitBody = String(body?.taal ?? '');
        const taal: Taal = isTaal(taalUitBody) ? taalUitBody : STANDAARD_TAAL;

        // Deze drie zijn onafhankelijk van elkaar. Ze stonden achter elkaar, wat
        // drie keer de latency naar de database kostte voordat het model ook maar
        // begon. De toegangsrijen worden ook voor admins opgehaald — één kleine
        // query verspillen is goedkoper dan een extra rondje wachten.
        const [profielResultaat, toegangResultaat, startHierResultaat] = await Promise.all([
          supabase.from('profiles').select('active, role').eq('user_id', user.id).single(),
          // Een mislukte toegangscontrole mag nooit als "onbeperkt" doorgaan: dan
          // zou een storing in deze query afgeschermde categorieën vrijgeven.
          // Vandaar de expliciete ok/fout in plaats van een catch naar null.
          haalToegankelijkeCategorieIds(supabase, user.id).then(
            (waarde) => ({ ok: true as const, waarde }),
            (fout: unknown) => ({ ok: false as const, fout }),
          ),
          supabase.from('categories').select('id').eq('slug', 'start-hier').maybeSingle(),
        ]);

        const profiel = profielResultaat.data;
        if (!profiel?.active) return faal('Dit account is niet actief.', 403);

        let toegestaneCategorieIds: Set<string> | null = null;
        if (profiel.role !== 'admin') {
          if (!toegangResultaat.ok) {
            return faal(
              toegangResultaat.fout instanceof Error
                ? toegangResultaat.fout.message
                : 'Toegang kon niet worden vastgesteld.',
            );
          }
          if (toegangResultaat.waarde) {
            toegestaneCategorieIds = new Set(toegangResultaat.waarde);
            // "Start hier" is voor iedereen bedoeld, ook wanneer de kennisbank
            // verder is afgeschermd.
            if (startHierResultaat.data) toegestaneCategorieIds.add(startHierResultaat.data.id);
          }
        }

        let conversationId: string | undefined = body?.conversationId || undefined;
        let nieuwGesprek = false;

        if (!conversationId) {
          const { data, error } = await supabase
            .from('conversations')
            .insert({ user_id: user.id, title: vraag.slice(0, 80) })
            .select('id')
            .single();
          if (error) return faal(error.message);
          conversationId = data.id;
          nieuwGesprek = true;
        } else {
          const { data: gesprek } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', conversationId)
            .eq('user_id', user.id)
            .maybeSingle();
          if (!gesprek) return faal('Gesprek niet gevonden.', 404);
        }

        // De client heeft het gespreks-id meteen nodig voor de URL; niet wachten
        // tot het antwoord er is.
        stuur('gesprek', { conversationId });

        // Vraag wegschrijven, geschiedenis ophalen en de kennisbank bouwen raken
        // elkaar niet. De geschiedenis wordt opgehaald zónder de zojuist gestelde
        // vraag — die plakken we er hieronder zelf achter, wat een rondje scheelt.
        const [invoegFout, geschiedenisResultaat, kennisbank] = await Promise.all([
          supabase
            .from('messages')
            .insert({ conversation_id: conversationId, role: 'user', content: vraag })
            .then((r) => r.error),
          nieuwGesprek
            ? Promise.resolve({ data: [], error: null })
            : supabase
                .from('messages')
                .select('role, content, escalated')
                .eq('conversation_id', conversationId)
                .order('created_at'),
          bouwKennisbank(supabase, { taal, toegestaneCategorieIds }),
        ]);

        if (invoegFout) return faal(invoegFout.message);
        if (geschiedenisResultaat.error) return faal(geschiedenisResultaat.error.message);

        const geschiedenis = (geschiedenisResultaat.data ?? []).map((m) => ({
          role: m.role as 'user' | 'assistant',
          // Een eerdere escalatie is opgeslagen als instructie aan de medewerker.
          // Zo teruggelezen imiteert het model die beurt en escaleert de volgende
          // vraag mee; vandaar de neutrale variant.
          content: m.escalated ? ESCALATIE_IN_GESCHIEDENIS : (m.content as string),
        }));

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        let laatsteVoortgang = '';
        let response;
        try {
          const modelStream = anthropic.messages.stream({
            model: process.env.ANTHROPIC_MODEL!,
            max_tokens: 4096,
            // Het model denkt sowieso na; met "summarized" krijgen we die
            // samenvattingen binnen en kunnen we ze als voortgang tonen. Zonder
            // deze regel gebeurt hetzelfde werk, maar ziet de medewerker niets.
            thinking: { type: 'adaptive', display: 'summarized' },
            system: [
              { type: 'text', text: systeempromptVast(taal) },
              {
                type: 'text',
                text: `KENNISBANK — ${kennisbank.aantalArtikelen} gepubliceerde artikelen:\n\n${kennisbank.systeemblok}`,
                cache_control: { type: 'ephemeral' },
              },
            ],
            messages: [...geschiedenis, { role: 'user' as const, content: vraag }],
            output_config: { format: ANTWOORD_SCHEMA, effort: 'low' },
          });

          modelStream.on('thinking', (delta) => {
            laatsteVoortgang += delta;
            // Op hele zinnen doorsturen; losse tokens leveren een onrustige regel op.
            const zinnen = laatsteVoortgang.split(/(?<=[.!?])\s+/);
            if (zinnen.length > 1) {
              laatsteVoortgang = zinnen.pop() ?? '';
              const zin = zinnen[zinnen.length - 1]?.trim();
              if (zin) stuur('bezig', { tekst: zin });
            }
          });

          response = await modelStream.finalMessage();
        } catch (e) {
          return faal(
            e instanceof Error ? e.message : 'De AI-assistent is niet bereikbaar.',
            502,
          );
        }

        const tekstBlok = response.content.find((b) => b.type === 'text');
        let geparsed: ModelAntwoord | null = null;
        try {
          geparsed = tekstBlok ? (JSON.parse(tekstBlok.text) as ModelAntwoord) : null;
        } catch {
          geparsed = null;
        }

        const zoekRefs = (refs: string[] | undefined): KennisbankArtikel[] =>
          (refs ?? [])
            .map((ref) => kennisbank.perRef.get(ref.trim().toUpperCase()))
            .filter((a): a is KennisbankArtikel => a !== undefined);

        const uitkomst = geparsed?.uitkomst ?? 'escalatie';
        const geldigeBronnen = zoekRefs(geparsed?.bronnen);

        // Nooit gokken: een antwoord zonder controleerbare bron is altijd een
        // escalatie, ook als het model zelf "antwoord" teruggaf. En de
        // escalatietekst is vast — het model formuleert zijn eigen
        // escalatiebericht niet, want dat kan zelf weer een aanname bevatten die
        // niet uit de kennisbank komt (bijv. "vraag het aan HR").
        const moetEscaleren =
          uitkomst === 'escalatie' || (uitkomst === 'antwoord' && geldigeBronnen.length === 0);

        // Een verduidelijkingsvraag heeft geen bron nodig: hij beweert niets over
        // een procedure, hij vraagt de medewerker om de ontbrekende informatie.
        const isVerduidelijking = !moetEscaleren && uitkomst === 'verduidelijking';

        const antwoord = moetEscaleren
          ? ESCALATIE_TEKST[taal]
          : (geparsed?.antwoord?.trim() || ESCALATIE_TEKST[taal]);

        const bronnenDetails = moetEscaleren || isVerduidelijking ? [] : geldigeBronnen;
        const dichtbijDetails = moetEscaleren ? zoekRefs(geparsed?.dichtbij) : [];

        const { data: opgeslagenBericht, error: berichtFout } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: antwoord,
            cited_article_ids: bronnenDetails.map((a) => a.id),
            escalated: moetEscaleren,
            origin_question: vraag,
          })
          .select('id')
          .single();
        if (berichtFout) return faal(berichtFout.message);

        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);

        stuur('klaar', {
          conversationId,
          berichtId: opgeslagenBericht.id,
          antwoord,
          escaleren: moetEscaleren,
          verduidelijking: isVerduidelijking,
          bronnen: bronnenDetails.map((a) => ({ slug: a.slug, title: a.title })),
          dichtbij: dichtbijDetails.map((a) => ({ slug: a.slug, title: a.title })),
        });
      } catch (e) {
        stuur('fout', { fout: e instanceof Error ? e.message : 'Onbekende fout.', status: 500 });
      } finally {
        if (open) {
          open = false;
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Voorkomt dat een tussenliggende proxy de stroom opspaart en alsnog in
      // één keer aflevert — dan zou de voortgang nergens toe dienen.
      'X-Accel-Buffering': 'no',
    },
  });
}
