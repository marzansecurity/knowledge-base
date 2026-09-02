'use client';

import { TaalLink } from '@/components/taal-link';
import { useVertalingen } from '@/components/vertaling-provider';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArtikelMarkdown } from '@/lib/markdown';
import { pad } from '@/lib/paden';
import type { Bericht, BerichtBron } from '@/lib/data';

type WeergaveBericht = Partial<Bericht> & {
  role: 'user' | 'assistant';
  content: string;
  bronnen?: BerichtBron[];
  escaleren?: boolean;
  /** Het model vroeg om ontbrekende informatie in plaats van te antwoorden. */
  verduidelijking?: boolean;
  /** Bij een escalatie: artikelen die er het dichtst bij komen, als leessuggestie. */
  dichtbij?: BerichtBron[];
};

/** Eén server-sent event uit /api/assistent. */
type Gebeurtenis = { event: string; data: Record<string, unknown> };

/**
 * Leest de SSE-stroom uit en levert de gebeurtenissen één voor één op. De
 * voortgang komt binnen terwijl het model nadenkt; het antwoord zelf pas als het
 * gecontroleerd is.
 */
async function* leesGebeurtenissen(body: ReadableStream<Uint8Array>): AsyncGenerator<Gebeurtenis> {
  const lezer = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await lezer.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let grens = buffer.indexOf('\n\n');
    while (grens !== -1) {
      const blok = buffer.slice(0, grens);
      buffer = buffer.slice(grens + 2);
      grens = buffer.indexOf('\n\n');

      let event = 'message';
      let ruweData = '';
      for (const regel of blok.split('\n')) {
        if (regel.startsWith('event: ')) event = regel.slice(7).trim();
        else if (regel.startsWith('data: ')) ruweData += regel.slice(6);
      }
      if (!ruweData) continue;
      try {
        yield { event, data: JSON.parse(ruweData) };
      } catch {
        // Een half aangekomen blok overslaan is beter dan de stroom afbreken.
      }
    }
  }
}

function FeedbackKnoppen({
  berichtId,
  helpful,
  onFeedback,
}: {
  berichtId?: string;
  helpful?: boolean | null;
  onFeedback: (berichtId: string, helpful: boolean) => void;
}) {
  const { berichten: t } = useVertalingen();
  if (!berichtId) return null;
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
      <span className="kb-label">{t.assistent.wasDitNuttig}</span>
      <button
        type="button"
        onClick={() => onFeedback(berichtId, true)}
        aria-pressed={helpful === true}
        className={`rounded-md border px-2 py-1 text-[13px] transition-colors ${
          helpful === true ? 'border-teal bg-[#f0faf6] text-[#1d5c46]' : 'border-line text-muted hover:bg-page'
        }`}
      >
        👍
      </button>
      <button
        type="button"
        onClick={() => onFeedback(berichtId, false)}
        aria-pressed={helpful === false}
        className={`rounded-md border px-2 py-1 text-[13px] transition-colors ${
          helpful === false ? 'border-negative bg-[#fdf0ef] text-negative' : 'border-line text-muted hover:bg-page'
        }`}
      >
        👎
      </button>
    </div>
  );
}

export function AssistentChat({
  conversationId,
  initieleBerichten,
}: {
  conversationId: string | null;
  initieleBerichten: Bericht[];
}) {
  const { taal, berichten: t } = useVertalingen();
  const router = useRouter();
  const [berichten, setBerichten] = useState<WeergaveBericht[]>(initieleBerichten);
  const [vraag, setVraag] = useState('');
  const [huidigId, setHuidigId] = useState(conversationId);
  const [bezig, startTransitie] = useTransition();
  const [fout, setFout] = useState<string | null>(null);
  const [voortgang, setVoortgang] = useState<string | null>(null);
  const bodemRef = useRef<HTMLDivElement>(null);

  function verstuur(e: React.FormEvent) {
    e.preventDefault();
    const tekst = vraag.trim();
    if (!tekst || bezig) return;

    setFout(null);
    setVoortgang(null);
    setVraag('');
    setBerichten((b) => [...b, { role: 'user', content: tekst }]);
    setTimeout(() => bodemRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    startTransitie(async () => {
      try {
        const res = await fetch('/api/assistent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // De taal moet mee: zonder dit veld valt de server terug op het
          // Nederlands en krijgt een Engelse of Franse medewerker een
          // Nederlands antwoord.
          body: JSON.stringify({ vraag: tekst, conversationId: huidigId, taal }),
        });
        if (!res.body) throw new Error(t.assistent.foutAlgemeen);

        let gesprekId = huidigId;

        for await (const { event, data } of leesGebeurtenissen(res.body)) {
          if (event === 'fout') {
            throw new Error(String(data.fout ?? t.assistent.foutAlgemeen));
          }

          if (event === 'gesprek') {
            gesprekId = String(data.conversationId);
            continue;
          }

          if (event === 'bezig') {
            setVoortgang(String(data.tekst ?? ''));
            continue;
          }

          if (event === 'klaar') {
            setVoortgang(null);
            setBerichten((b) => [
              ...b,
              {
                id: data.berichtId as string,
                role: 'assistant',
                content: data.antwoord as string,
                bronnen: data.bronnen as BerichtBron[],
                dichtbij: data.dichtbij as BerichtBron[],
                escaleren: data.escaleren as boolean,
                verduidelijking: data.verduidelijking as boolean,
                helpful: null,
              },
            ]);
          }
        }

        if (!huidigId && gesprekId) {
          setHuidigId(gesprekId);
          router.replace(`${pad(taal, '/assistent')}?gesprek=${gesprekId}`, { scroll: false });
          router.refresh();
        }
        setTimeout(() => bodemRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      } catch (e) {
        setFout(e instanceof Error ? e.message : t.assistent.foutOnbekend);
      } finally {
        setVoortgang(null);
      }
    });
  }

  function geefFeedback(berichtId: string, helpful: boolean) {
    setBerichten((b) => b.map((m) => (m.id === berichtId ? { ...m, helpful } : m)));
    fetch('/api/assistent/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: berichtId, helpful }),
    }).catch(() => {
      setBerichten((b) => b.map((m) => (m.id === berichtId ? { ...m, helpful: null } : m)));
    });
  }

  return (
    <div className="flex min-h-[75vh] flex-col">
      <div className="kb-card flex-1 space-y-4 overflow-y-auto p-5">
        {berichten.length === 0 && (
          <div className="kb-empty mx-auto max-w-[560px]">{t.assistent.introTekst}</div>
        )}

        {berichten.map((b, i) => (
          <div
            key={b.id ?? i}
            className={b.role === 'user' ? 'ml-auto max-w-[600px]' : 'max-w-[680px]'}
          >
            {b.role === 'user' ? (
              <div className="rounded-lg bg-navy px-4 py-2.5 text-[13px] text-white">{b.content}</div>
            ) : (
              <div
                className={`rounded-lg border p-4 ${
                  b.escaleren
                    ? 'border-amber bg-[#fffbf5]'
                    : b.verduidelijking
                      ? 'border-teal bg-[#f0faf6]'
                      : 'border-line bg-white'
                }`}
              >
                {b.verduidelijking && (
                  <p className="kb-label mb-2">{t.assistent.verduidelijking}</p>
                )}
                <ArtikelMarkdown>{b.content}</ArtikelMarkdown>
                {b.bronnen && b.bronnen.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    <span className="kb-label">{t.assistent.bronnen}</span>
                    {b.bronnen.map((bron) => (
                      <TaalLink key={bron.slug} href={`/bibliotheek/${bron.slug}`} className="kb-chip">
                        {bron.title}
                      </TaalLink>
                    ))}
                  </div>
                )}
                {/* Een escalatie was een doodlopende weg: één zin en verder niets.
                    Deze artikelen zijn nadrukkelijk geen antwoord, maar geven de
                    medewerker wel een richting om zelf verder te kijken. */}
                {b.escaleren && b.dichtbij && b.dichtbij.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    <span className="kb-label">{t.assistent.dichtbij}</span>
                    {b.dichtbij.map((bron) => (
                      <TaalLink key={bron.slug} href={`/bibliotheek/${bron.slug}`} className="kb-chip">
                        {bron.title}
                      </TaalLink>
                    ))}
                  </div>
                )}
                {!b.escaleren && !b.verduidelijking && (
                  <FeedbackKnoppen berichtId={b.id} helpful={b.helpful} onFeedback={geefFeedback} />
                )}
              </div>
            )}
          </div>
        ))}

        {/* De voortgangsregel komt uit het model zelf, terwijl het nadenkt. Zonder
            dit was elke wachttijd stille wachttijd — en dat is precies waardoor
            de assistent traag aanvoelde. */}
        {bezig && (
          <div className="kb-empty" aria-live="polite">
            {voortgang ? (
              <span className="italic text-muted">{voortgang}</span>
            ) : (
              t.assistent.bezigMetAntwoorden
            )}
          </div>
        )}
        <div ref={bodemRef} />
      </div>

      {fout && (
        <p className="mt-3 rounded-md border border-[#f5c6c2] bg-[#fdf0ef] px-4 py-2.5 text-[13px] text-negative">
          {fout}
        </p>
      )}

      <form onSubmit={verstuur} className="mt-4 flex gap-3">
        <input
          value={vraag}
          onChange={(e) => setVraag(e.target.value)}
          placeholder={t.assistent.vraagPlaceholder}
          className="kb-input"
          disabled={bezig}
        />
        <button type="submit" disabled={bezig || !vraag.trim()} className="kb-btn kb-btn-primary whitespace-nowrap">
          {t.assistent.versturen}
        </button>
      </form>
    </div>
  );
}
