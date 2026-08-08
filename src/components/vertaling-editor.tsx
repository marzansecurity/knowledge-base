'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArtikelMarkdown } from '@/lib/markdown';
import { useVertalingen } from '@/components/vertaling-provider';
import { TAAL_NAAM, type Taal } from '@/lib/talen';
import type { ArticleTranslation } from '@/lib/types';
import { bewaarVertaling, markeerVertalingNagekeken } from '@/app/[taal]/beheer/artikelen/acties';

type Bron = { title: string; summary: string | null; content_markdown: string };

type Props = {
  articleId: string;
  doelTaal: Taal;
  /** De bestaande vertaling, of null als die er nog niet is. */
  vertaling: ArticleTranslation | null;
  /** Het Nederlandse origineel, ter vergelijking naast het vertaalvak. */
  bron: Bron;
};

/**
 * Bewerkt één taalversie van een artikel. Het Nederlands loopt hier niet
 * doorheen: dat is de bron en wordt via de gewone artikeleditor opgeslagen.
 */
export function VertalingEditor({ articleId, doelTaal, vertaling, bron }: Props) {
  const router = useRouter();
  const { berichten: t } = useVertalingen();

  const [titel, setTitel] = useState(vertaling?.title ?? '');
  const [samenvatting, setSamenvatting] = useState(vertaling?.summary ?? '');
  const [inhoud, setInhoud] = useState(vertaling?.content_markdown ?? '');
  const [slug, setSlug] = useState(vertaling?.slug ?? '');
  const [tab, setTab] = useState<'bewerken' | 'voorbeeld'>('bewerken');
  const [melding, setMelding] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [genereren, setGenereren] = useState(false);
  const [bezig, startTransitie] = useTransition();

  async function genereerVertaling() {
    setFout(null);
    setMelding(null);
    setGenereren(true);
    try {
      const antwoord = await fetch('/api/vertaling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, doelTaal }),
      });
      const data = await antwoord.json();
      if (!antwoord.ok) {
        setFout(data.fout ?? t.vertaling.genererenMislukt);
        return;
      }
      // Bewust alleen in het formulier zetten, niet opslaan: de redacteur kijkt
      // het na en drukt zelf op opslaan.
      setTitel(data.titel);
      setSamenvatting(data.samenvatting ?? '');
      setInhoud(data.inhoud_markdown);
      if (!slug) setSlug(data.slug);
      setMelding(t.vertaling.conceptKlaar);
    } catch {
      setFout(t.vertaling.genererenMislukt);
    } finally {
      setGenereren(false);
    }
  }

  function bewaar() {
    setFout(null);
    setMelding(null);
    const formData = new FormData();
    formData.set('title', titel);
    formData.set('summary', samenvatting);
    formData.set('content_markdown', inhoud);
    formData.set('slug', slug);

    startTransitie(async () => {
      const resultaat = await bewaarVertaling(articleId, doelTaal, formData);
      if (resultaat.fout) setFout(resultaat.fout);
      else {
        setMelding(t.editor.opgeslagen);
        router.refresh();
      }
    });
  }

  function markeerNagekeken() {
    startTransitie(async () => {
      const resultaat = await markeerVertalingNagekeken(articleId, doelTaal);
      if (resultaat.fout) setFout(resultaat.fout);
      else {
        setMelding(t.vertaling.nagekekenMelding);
        router.refresh();
      }
    });
  }

  const bezigOfGenereren = bezig || genereren;

  return (
    <div className="space-y-3.5">
      {vertaling?.stale && (
        <div className="rounded-md border border-amber bg-amber/10 px-4 py-3 text-[13px] text-ink-soft">
          {t.vertaling.verouderd}
        </div>
      )}

      <div className="kb-card space-y-3 p-5">
        <input
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          className="w-full border-none bg-transparent text-[18px] font-bold text-navy outline-none"
          placeholder={t.editor.titelPlaceholder}
        />
        <input
          value={samenvatting}
          onChange={(e) => setSamenvatting(e.target.value)}
          className="kb-input"
          placeholder={t.editor.samenvattingPlaceholder}
        />
        <div>
          <label htmlFor="vertaling-slug" className="kb-label mb-1.5 block">
            {t.vertaling.slugLabel}
          </label>
          <input
            id="vertaling-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="kb-input"
            placeholder={t.vertaling.slugPlaceholder}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <button
            type="button"
            onClick={genereerVertaling}
            disabled={bezigOfGenereren}
            className="kb-btn kb-btn-accent"
          >
            {genereren ? t.vertaling.genereren_bezig : t.vertaling.genereren}
          </button>
          <button type="button" onClick={bewaar} disabled={bezigOfGenereren} className="kb-btn kb-btn-primary">
            {t.algemeen.opslaan}
          </button>
          {vertaling && vertaling.review_state === 'concept' && (
            <button type="button" onClick={markeerNagekeken} disabled={bezigOfGenereren} className="kb-btn">
              {t.vertaling.markeerNagekeken}
            </button>
          )}
          {melding && <span className="text-[13px] text-teal">{melding}</span>}
          {fout && <span className="text-[13px] text-red-600">{fout}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {/* Links het Nederlandse origineel, ter vergelijking. */}
        <div className="kb-card p-5">
          <div className="kb-section-title mb-3">{t.vertaling.brontekst}</div>
          <div className="text-[15px] font-semibold text-navy">{bron.title}</div>
          {bron.summary && <p className="mt-1 text-[13px] text-muted">{bron.summary}</p>}
          <div className="mt-3 max-h-[480px] overflow-y-auto border-t border-line pt-3">
            <ArtikelMarkdown>{bron.content_markdown}</ArtikelMarkdown>
          </div>
        </div>

        <div className="kb-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('bewerken')}
              className={`kb-chip ${tab === 'bewerken' ? 'kb-chip-active' : ''}`}
            >
              {t.editor.tabBewerken}
            </button>
            <button
              type="button"
              onClick={() => setTab('voorbeeld')}
              className={`kb-chip ${tab === 'voorbeeld' ? 'kb-chip-active' : ''}`}
            >
              {t.editor.tabVoorbeeld}
            </button>
            <span className="ml-auto text-[12px] text-muted">{TAAL_NAAM[doelTaal]}</span>
          </div>

          {tab === 'bewerken' ? (
            <textarea
              value={inhoud}
              onChange={(e) => setInhoud(e.target.value)}
              rows={20}
              className="kb-input font-mono text-[13px]"
              placeholder={t.editor.inhoudPlaceholder}
            />
          ) : inhoud.trim() ? (
            <div className="max-h-[480px] overflow-y-auto">
              <ArtikelMarkdown>{inhoud}</ArtikelMarkdown>
            </div>
          ) : (
            <p className="kb-empty">{t.editor.geenInhoud}</p>
          )}
        </div>
      </div>
    </div>
  );
}
