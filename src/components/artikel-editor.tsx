'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArtikelMarkdown, CALLOUT_TYPES, type CalloutType } from '@/lib/markdown';
import { StatusBadge } from '@/components/status-badge';
import type { ArticleDetail, ArticleStatus, Category } from '@/lib/types';
import {
  archiveerArtikel,
  bewaarArtikel,
  herstelRevisie,
  markeerGecontroleerd,
  uploadAfbeelding,
  wijzigStatus,
} from '@/app/beheer/artikelen/acties';

const CALLOUT_LABELS: Record<CalloutType, string> = {
  TIP: '💡 Tip',
  INFO: 'ℹ️ Info',
  WARNING: '⚠️ Waarschuwing',
};

type Revisie = {
  id: string;
  title: string;
  saved_at: string;
  change_note: string | null;
  saved_by_naam: string | null;
};

type Props = {
  artikel: ArticleDetail;
  categorieen: Category[];
  revisies: Revisie[];
};

const VOLGENDE_STATUS: Partial<Record<ArticleStatus, { naar: ArticleStatus; label: string; klasse: string }[]>> = {
  draft: [{ naar: 'published', label: 'Publiceren', klasse: 'kb-btn-primary' }],
  published: [
    { naar: 'outdated', label: 'Markeer als verouderd', klasse: '' },
    { naar: 'draft', label: 'Terug naar concept', klasse: '' },
  ],
  outdated: [
    { naar: 'published', label: 'Opnieuw publiceren', klasse: 'kb-btn-primary' },
    { naar: 'draft', label: 'Terug naar concept', klasse: '' },
  ],
  archived: [{ naar: 'draft', label: 'Herstellen als concept', klasse: '' }],
};

export function ArtikelEditor({ artikel, categorieen, revisies }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'bewerken' | 'voorbeeld' | 'geschiedenis'>('bewerken');
  const [titel, setTitel] = useState(artikel.title);
  const [samenvatting, setSamenvatting] = useState(artikel.summary ?? '');
  const [inhoud, setInhoud] = useState(artikel.content_markdown);
  const [categoryId, setCategoryId] = useState(artikel.category_id ?? '');
  const [melding, setMelding] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [uploadBezig, setUploadBezig] = useState(false);
  const [bezig, startTransitie] = useTransition();
  const wijzignotitieRef = useRef<HTMLInputElement>(null);
  const inhoudRef = useRef<HTMLTextAreaElement>(null);
  const bestandInputRef = useRef<HTMLInputElement>(null);

  const gewijzigd = titel !== artikel.title || inhoud !== artikel.content_markdown;

  /** Voegt tekst in op de cursorpositie van het tekstvak (of vervangt de selectie). */
  function voegInBijCursor(tekst: string) {
    const el = inhoudRef.current;
    if (!el) {
      setInhoud((huidig) => `${huidig}\n\n${tekst}\n`);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const eind = el.selectionEnd ?? el.value.length;
    const nieuw = `${el.value.slice(0, start)}${tekst}${el.value.slice(eind)}`;
    setInhoud(nieuw);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + tekst.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  function voegCalloutIn(type: CalloutType) {
    voegInBijCursor(`\n> [!${type}] Typ hier de tekst\n\n`);
  }

  async function uploadEnVoegAfbeeldingIn(bestand: File) {
    if (!bestand.type.startsWith('image/')) {
      setFout('Alleen afbeeldingen zijn toegestaan.');
      return;
    }
    setFout(null);
    setUploadBezig(true);
    const formData = new FormData();
    formData.set('bestand', bestand);
    const resultaat = await uploadAfbeelding(formData);
    setUploadBezig(false);
    if (resultaat.fout || !resultaat.pad) {
      setFout(resultaat.fout ?? 'Uploaden mislukt.');
      return;
    }
    voegInBijCursor(`![${bestand.name}](${resultaat.pad})`);
  }

  function opBestandGekozen(e: React.ChangeEvent<HTMLInputElement>) {
    const bestand = e.target.files?.[0];
    e.target.value = '';
    if (bestand) void uploadEnVoegAfbeeldingIn(bestand);
  }

  function opPlakken(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const bestand = Array.from(e.clipboardData.items)
      .find((item) => item.type.startsWith('image/'))
      ?.getAsFile();
    if (bestand) {
      e.preventDefault();
      void uploadEnVoegAfbeeldingIn(bestand);
    }
  }

  function opSlepen(e: React.DragEvent<HTMLTextAreaElement>) {
    const bestand = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
    if (bestand) {
      e.preventDefault();
      void uploadEnVoegAfbeeldingIn(bestand);
    }
  }

  function bewaar() {
    setFout(null);
    setMelding(null);
    const formData = new FormData();
    formData.set('title', titel);
    formData.set('summary', samenvatting);
    formData.set('content_markdown', inhoud);
    formData.set('category_id', categoryId);
    formData.set('change_note', wijzignotitieRef.current?.value ?? '');

    startTransitie(async () => {
      const resultaat = await bewaarArtikel(artikel.id, formData);
      if (resultaat.fout) setFout(resultaat.fout);
      else {
        setMelding('Opgeslagen.');
        if (wijzignotitieRef.current) wijzignotitieRef.current.value = '';
        router.refresh();
      }
    });
  }

  function status(naar: ArticleStatus) {
    startTransitie(async () => {
      const resultaat = await wijzigStatus(artikel.id, naar);
      if (resultaat.fout) setFout(resultaat.fout);
      else {
        setMelding(naar === 'published' ? 'Gepubliceerd.' : 'Status bijgewerkt.');
        router.refresh();
      }
    });
  }

  function markeerControle() {
    startTransitie(async () => {
      await markeerGecontroleerd(artikel.id);
      setMelding('Gemarkeerd als vandaag gecontroleerd.');
      router.refresh();
    });
  }

  function archiveer() {
    if (!confirm('Dit artikel archiveren? Het verdwijnt dan uit de bibliotheek maar blijft bewaard.')) return;
    startTransitie(async () => {
      const resultaat = await archiveerArtikel(artikel.id);
      if (resultaat.fout) setFout(resultaat.fout);
      else router.push('/beheer/artikelen');
    });
  }

  function zetTerug(revisionId: string) {
    if (!confirm('Deze versie terugzetten? De huidige inhoud wordt eerst als revisie bewaard.')) return;
    startTransitie(async () => {
      const resultaat = await herstelRevisie(artikel.id, revisionId);
      if (resultaat.fout) setFout(resultaat.fout);
      else {
        setMelding('Eerdere versie teruggezet.');
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3.5">
      <div className="kb-card space-y-3 p-3.5">
        <div className="flex items-start justify-between gap-4">
          <input
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            className="w-full border-none bg-transparent text-[18px] font-bold text-navy outline-none"
            placeholder="Titel van het artikel"
          />
          <StatusBadge status={artikel.status} />
        </div>

        <input
          value={samenvatting}
          onChange={(e) => setSamenvatting(e.target.value)}
          className="kb-input"
          placeholder="Korte samenvatting (verschijnt in de bibliotheekkaart en het AI-antwoord)"
        />

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="kb-input max-w-xs"
        >
          <option value="">Geen categorie</option>
          {categorieen.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="kb-card p-0">
        <div className="flex items-center gap-1 border-b border-line px-4 pt-3">
          {(['bewerken', 'voorbeeld', 'geschiedenis'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-t-md border border-b-0 px-4 py-2 text-[13px] font-semibold transition-colors ${
                tab === t
                  ? 'border-line bg-white text-navy'
                  : 'border-transparent bg-transparent text-muted hover:text-navy'
              }`}
            >
              {t === 'bewerken' ? 'Bewerken' : t === 'voorbeeld' ? 'Voorbeeld' : `Geschiedenis (${revisies.length})`}
            </button>
          ))}
        </div>

        <div className="p-3.5">
          {tab === 'bewerken' && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={bestandInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={opBestandGekozen}
                />
                <button
                  type="button"
                  onClick={() => bestandInputRef.current?.click()}
                  disabled={uploadBezig}
                  className="kb-btn"
                >
                  {uploadBezig ? 'Uploaden…' : '🖼️ Afbeelding'}
                </button>
                <span className="mx-1 h-5 w-px bg-line" />
                {CALLOUT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => voegCalloutIn(type)}
                    className="kb-btn"
                  >
                    {CALLOUT_LABELS[type]}
                  </button>
                ))}
              </div>

              <textarea
                ref={inhoudRef}
                value={inhoud}
                onChange={(e) => setInhoud(e.target.value)}
                onPaste={opPlakken}
                onDrop={opSlepen}
                onDragOver={(e) => e.preventDefault()}
                className="h-[520px] w-full resize-y rounded-md border border-line bg-page p-4 font-mono text-[13px] leading-relaxed text-ink outline-none focus:border-teal focus:bg-white"
                placeholder="# Titel&#10;&#10;Inhoud in Markdown… (plak of sleep een afbeelding hierin)"
                spellCheck={false}
              />
              <p className="text-[11px] text-muted">
                Tip: plak of sleep een afbeelding rechtstreeks in het tekstvak. Gebruik de knoppen
                hierboven voor een gekleurd highlight-vak (tip, info of waarschuwing), zoals in Zoho
                Desk.
              </p>
            </div>
          )}

          {tab === 'voorbeeld' && (
            <div className="min-h-[520px] rounded-md border border-line p-3.5">
              {inhoud.trim() ? (
                <ArtikelMarkdown>{inhoud}</ArtikelMarkdown>
              ) : (
                <p className="kb-empty">Nog geen inhoud om te tonen.</p>
              )}
            </div>
          )}

          {tab === 'geschiedenis' && (
            <ul className="space-y-2">
              {revisies.length === 0 && <li className="kb-empty">Nog geen eerdere versies.</li>}
              {revisies.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-md border border-line p-3"
                >
                  <div>
                    <div className="text-[13px] font-medium text-ink">{r.title}</div>
                    <div className="text-[11px] text-muted">
                      {new Date(r.saved_at).toLocaleString('nl-NL')}
                      {r.saved_by_naam && ` · ${r.saved_by_naam}`}
                      {r.change_note && ` · ${r.change_note}`}
                    </div>
                  </div>
                  <button onClick={() => zetTerug(r.id)} disabled={bezig} className="kb-btn">
                    Terugzetten
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="kb-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={wijzignotitieRef}
            type="text"
            placeholder="Wijzignotitie (optioneel)"
            className="kb-input w-56"
          />
          <button onClick={bewaar} disabled={bezig || !gewijzigd} className="kb-btn kb-btn-primary">
            {bezig ? 'Bezig…' : 'Opslaan'}
          </button>
          <button onClick={markeerControle} disabled={bezig} className="kb-btn">
            Markeer als gecontroleerd
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(VOLGENDE_STATUS[artikel.status] ?? []).map((optie) => (
            <button
              key={optie.naar}
              onClick={() => status(optie.naar)}
              disabled={bezig}
              className={`kb-btn ${optie.klasse}`}
            >
              {optie.label}
            </button>
          ))}
          {artikel.status !== 'archived' && (
            <button
              onClick={archiveer}
              disabled={bezig}
              className="kb-btn border-negative text-negative hover:bg-[#fdf0ef]"
            >
              Archiveren
            </button>
          )}
        </div>
      </div>

      {melding && (
        <p className="rounded-md border border-[#bfe8d4] bg-[#f0faf6] px-3 py-2 text-[12px] text-positive">
          {melding}
        </p>
      )}
      {fout && (
        <p className="rounded-md border border-[#f5c6c2] bg-[#fdf0ef] px-3 py-2 text-[12px] text-negative">
          {fout}
        </p>
      )}
    </div>
  );
}
