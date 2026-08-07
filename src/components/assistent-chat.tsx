'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArtikelMarkdown } from '@/lib/markdown';
import type { Bericht, BerichtBron } from '@/lib/data';

type WeergaveBericht = Partial<Bericht> & {
  role: 'user' | 'assistant';
  content: string;
  bronnen?: BerichtBron[];
  escaleren?: boolean;
};

function FeedbackKnoppen({
  berichtId,
  helpful,
  onFeedback,
}: {
  berichtId?: string;
  helpful?: boolean | null;
  onFeedback: (berichtId: string, helpful: boolean) => void;
}) {
  if (!berichtId) return null;
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
      <span className="kb-label">Was dit nuttig?</span>
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
  const router = useRouter();
  const [berichten, setBerichten] = useState<WeergaveBericht[]>(initieleBerichten);
  const [vraag, setVraag] = useState('');
  const [huidigId, setHuidigId] = useState(conversationId);
  const [bezig, startTransitie] = useTransition();
  const [fout, setFout] = useState<string | null>(null);
  const bodemRef = useRef<HTMLDivElement>(null);

  function verstuur(e: React.FormEvent) {
    e.preventDefault();
    const tekst = vraag.trim();
    if (!tekst || bezig) return;

    setFout(null);
    setVraag('');
    setBerichten((b) => [...b, { role: 'user', content: tekst }]);
    setTimeout(() => bodemRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    startTransitie(async () => {
      try {
        const res = await fetch('/api/assistent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vraag: tekst, conversationId: huidigId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.fout ?? 'Er ging iets mis.');

        setBerichten((b) => [
          ...b,
          {
            id: data.berichtId,
            role: 'assistant',
            content: data.antwoord,
            bronnen: data.bronnen,
            escaleren: data.escaleren,
            helpful: null,
          },
        ]);

        if (!huidigId) {
          setHuidigId(data.conversationId);
          router.replace(`/assistent?gesprek=${data.conversationId}`, { scroll: false });
          router.refresh();
        }
        setTimeout(() => bodemRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      } catch (e) {
        setFout(e instanceof Error ? e.message : 'Onbekende fout.');
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
      <div className="kb-card flex-1 space-y-4 overflow-y-auto p-2.5">
        {berichten.length === 0 && (
          <div className="kb-empty mx-auto max-w-[560px]">
            Stel een vraag over een procedure. Het antwoord verwijst altijd naar het gebruikte artikel — en
            als het niet in de kennisbank staat, escaleert de assistent naar Martijn in plaats van te gokken.
          </div>
        )}

        {berichten.map((b, i) => (
          <div
            key={b.id ?? i}
            className={b.role === 'user' ? 'ml-auto max-w-[600px]' : 'max-w-[680px]'}
          >
            {b.role === 'user' ? (
              <div className="rounded-lg bg-navy px-3 py-2.5 text-[13px] text-white">{b.content}</div>
            ) : (
              <div
                className={`rounded-lg border p-3 ${
                  b.escaleren ? 'border-amber bg-[#fffbf5]' : 'border-line bg-white'
                }`}
              >
                <ArtikelMarkdown>{b.content}</ArtikelMarkdown>
                {b.bronnen && b.bronnen.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    <span className="kb-label">Bronnen:</span>
                    {b.bronnen.map((bron) => (
                      <Link key={bron.slug} href={`/bibliotheek/${bron.slug}`} className="kb-chip">
                        {bron.title}
                      </Link>
                    ))}
                  </div>
                )}
                {!b.escaleren && (
                  <FeedbackKnoppen berichtId={b.id} helpful={b.helpful} onFeedback={geefFeedback} />
                )}
              </div>
            )}
          </div>
        ))}

        {bezig && <div className="kb-empty">Bezig met antwoorden…</div>}
        <div ref={bodemRef} />
      </div>

      {fout && (
        <p className="mt-3 rounded-md border border-[#f5c6c2] bg-[#fdf0ef] px-3 py-2.5 text-[13px] text-negative">
          {fout}
        </p>
      )}

      <form onSubmit={verstuur} className="mt-4 flex gap-3">
        <input
          value={vraag}
          onChange={(e) => setVraag(e.target.value)}
          placeholder="Stel je vraag…"
          className="kb-input"
          disabled={bezig}
        />
        <button type="submit" disabled={bezig || !vraag.trim()} className="kb-btn kb-btn-primary whitespace-nowrap">
          Versturen
        </button>
      </form>
    </div>
  );
}
