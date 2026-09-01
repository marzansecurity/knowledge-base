'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArtikelMarkdown, CALLOUT_TYPES, type CalloutType } from '@/lib/markdown';
import { StatusBadge } from '@/components/status-badge';
import { useVertalingen } from '@/components/vertaling-provider';
import { pad } from '@/lib/paden';
import { TAAL_OPMAAK } from '@/lib/talen';
import {
  ARTICLE_CHANNELS,
  ARTICLE_TYPES,
  COUNTRIES,
  type ArticleChannel,
  type ArticleDetail,
  type ArticleStatus,
  type ArticleType,
  type Category,
  type Country,
} from '@/lib/types';
import {
  archiveerArtikel,
  bewaarArtikel,
  herstelRevisie,
  markeerGecontroleerd,
  uploadAfbeelding,
  wijzigStatus,
} from '@/app/[taal]/beheer/artikelen/acties';

/** De sleutel in t.editor waaronder het label van dit callout-type staat. */
const CALLOUT_SLEUTEL: Record<CalloutType, 'calloutTip' | 'calloutInfo' | 'calloutWaarschuwing'> = {
  TIP: 'calloutTip',
  INFO: 'calloutInfo',
  WARNING: 'calloutWaarschuwing',
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

/** Per status de vervolgstappen, met de sleutel in t.editor voor het knoplabel. */
type Vervolgstap = {
  naar: ArticleStatus;
  sleutel: 'publiceren' | 'markeerVerouderd' | 'terugNaarConcept' | 'opnieuwPubliceren' | 'herstellenAlsConcept';
  klasse: string;
};

const VOLGENDE_STATUS: Partial<Record<ArticleStatus, Vervolgstap[]>> = {
  draft: [{ naar: 'published', sleutel: 'publiceren', klasse: 'kb-btn-primary' }],
  published: [
    { naar: 'outdated', sleutel: 'markeerVerouderd', klasse: '' },
    { naar: 'draft', sleutel: 'terugNaarConcept', klasse: '' },
  ],
  outdated: [
    { naar: 'published', sleutel: 'opnieuwPubliceren', klasse: 'kb-btn-primary' },
    { naar: 'draft', sleutel: 'terugNaarConcept', klasse: '' },
  ],
  archived: [{ naar: 'draft', sleutel: 'herstellenAlsConcept', klasse: '' }],
};

export function ArtikelEditor({ artikel, categorieen, revisies }: Props) {
  const router = useRouter();
  const { taal, berichten: t } = useVertalingen();
  const [tab, setTab] = useState<'bewerken' | 'voorbeeld' | 'geschiedenis'>('bewerken');
  const [titel, setTitel] = useState(artikel.title);
  const [samenvatting, setSamenvatting] = useState(artikel.summary ?? '');
  const [inhoud, setInhoud] = useState(artikel.content_markdown);
  const [categoryId, setCategoryId] = useState(artikel.category_id ?? '');
  const [type, setType] = useState<ArticleType>(artikel.type);
  const [kanaal, setKanaal] = useState<ArticleChannel>(artikel.channel);
  const [landen, setLanden] = useState<Country[]>(artikel.countries ?? []);
  const [padVolgorde, setPadVolgorde] = useState(
    artikel.path_order === null ? '' : String(artikel.path_order),
  );
  const [verplicht, setVerplicht] = useState(artikel.required_reading);
  const [melding, setMelding] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [uploadBezig, setUploadBezig] = useState(false);
  const [bezig, startTransitie] = useTransition();
  const wijzignotitieRef = useRef<HTMLInputElement>(null);
  const inhoudRef = useRef<HTMLTextAreaElement>(null);
  const bestandInputRef = useRef<HTMLInputElement>(null);

  const gewijzigd =
    titel !== artikel.title ||
    inhoud !== artikel.content_markdown ||
    samenvatting !== (artikel.summary ?? '') ||
    categoryId !== (artikel.category_id ?? '') ||
    type !== artikel.type ||
    kanaal !== artikel.channel ||
    landen.join(',') !== (artikel.countries ?? []).join(',') ||
    padVolgorde !== (artikel.path_order === null ? '' : String(artikel.path_order)) ||
    verplicht !== artikel.required_reading;

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
    voegInBijCursor(`\n> [!${type}] ${t.editor.calloutPlaceholder}\n\n`);
  }

  async function uploadEnVoegAfbeeldingIn(bestand: File) {
    if (!bestand.type.startsWith('image/')) {
      setFout(t.editor.alleenAfbeeldingen);
      return;
    }
    setFout(null);
    setUploadBezig(true);
    const formData = new FormData();
    formData.set('bestand', bestand);
    const resultaat = await uploadAfbeelding(formData);
    setUploadBezig(false);
    if (resultaat.fout || !resultaat.pad) {
      setFout(resultaat.fout ?? t.editor.uploadenMislukt);
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
    formData.set('type', type);
    formData.set('channel', kanaal);
    for (const land of landen) formData.append('countries', land);
    formData.set('path_order', padVolgorde);
    if (verplicht) formData.set('required_reading', 'on');
    formData.set('change_note', wijzignotitieRef.current?.value ?? '');

    startTransitie(async () => {
      const resultaat = await bewaarArtikel(artikel.id, formData);
      if (resultaat.fout) setFout(resultaat.fout);
      else {
        setMelding(t.editor.opgeslagen);
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
        setMelding(naar === 'published' ? t.editor.gepubliceerd : t.editor.statusBijgewerkt);
        router.refresh();
      }
    });
  }

  function markeerControle() {
    startTransitie(async () => {
      await markeerGecontroleerd(artikel.id);
      setMelding(t.editor.gecontroleerdMelding);
      router.refresh();
    });
  }

  function archiveer() {
    if (!confirm(t.editor.bevestigArchiveren)) return;
    startTransitie(async () => {
      const resultaat = await archiveerArtikel(artikel.id);
      if (resultaat.fout) setFout(resultaat.fout);
      else router.push(pad(taal, '/beheer/artikelen'));
    });
  }

  function zetTerug(revisionId: string) {
    if (!confirm(t.editor.bevestigTerugzetten)) return;
    startTransitie(async () => {
      const resultaat = await herstelRevisie(artikel.id, revisionId);
      if (resultaat.fout) setFout(resultaat.fout);
      else {
        setMelding(t.editor.versieTeruggezet);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3.5">
      <div className="kb-card space-y-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <input
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            className="w-full border-none bg-transparent text-[18px] font-bold text-navy outline-none"
            placeholder={t.editor.titelPlaceholder}
          />
          <StatusBadge status={artikel.status} />
        </div>

        <input
          value={samenvatting}
          onChange={(e) => setSamenvatting(e.target.value)}
          className="kb-input"
          placeholder={t.editor.samenvattingPlaceholder}
        />

        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="kb-label">{t.editor.categorieLabel}</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="kb-input w-52"
            >
              <option value="">{t.editor.geenCategorie}</option>
              {categorieen.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="kb-label">{t.editor.typeLabel}</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ArticleType)}
              className="kb-input w-44"
            >
              {ARTICLE_TYPES.map((waarde) => (
                <option key={waarde} value={waarde}>
                  {t.labels.artikeltype[waarde]}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="kb-label">{t.editor.kanaalLabel}</span>
            <select
              value={kanaal}
              onChange={(e) => setKanaal(e.target.value as ArticleChannel)}
              className="kb-input w-40"
            >
              {ARTICLE_CHANNELS.map((waarde) => (
                <option key={waarde} value={waarde}>
                  {t.labels.kanaal[waarde]}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-1">
            <span className="kb-label">{t.editor.landenLabel}</span>
            <div className="flex h-[34px] items-center gap-3">
              {COUNTRIES.map((land) => (
                <label key={land} className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                  <input
                    type="checkbox"
                    checked={landen.includes(land)}
                    onChange={(e) =>
                      setLanden((huidig) =>
                        e.target.checked ? [...huidig, land] : huidig.filter((l) => l !== land),
                      )
                    }
                  />
                  {t.labels.land[land]}
                </label>
              ))}
            </div>
          </div>

          <label className="grid gap-1">
            <span className="kb-label">{t.editor.leerpadLabel}</span>
            <input
              type="number"
              min={1}
              value={padVolgorde}
              onChange={(e) => setPadVolgorde(e.target.value)}
              className="kb-input w-24"
              placeholder="—"
            />
          </label>

          <label className="flex h-[34px] items-center gap-1.5 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              checked={verplicht}
              onChange={(e) => setVerplicht(e.target.checked)}
            />
            {t.editor.verplichtLabel}
          </label>
        </div>
        <p className="text-[11px] text-muted">{t.editor.landenToelichting}</p>
      </div>

      <div className="kb-card p-0">
        <div className="flex items-center gap-1 border-b border-line px-4 pt-3">
          {(['bewerken', 'voorbeeld', 'geschiedenis'] as const).map((naam) => (
            <button
              key={naam}
              onClick={() => setTab(naam)}
              className={`rounded-t-md border border-b-0 px-4 py-2 text-[13px] font-semibold transition-colors ${
                tab === naam
                  ? 'border-line bg-white text-navy'
                  : 'border-transparent bg-transparent text-muted hover:text-navy'
              }`}
            >
              {naam === 'bewerken'
                ? t.editor.tabBewerken
                : naam === 'voorbeeld'
                  ? t.editor.tabVoorbeeld
                  : t.editor.tabGeschiedenis.replace('{aantal}', String(revisies.length))}
            </button>
          ))}
        </div>

        <div className="p-5">
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
                  {uploadBezig ? t.editor.uploaden : t.editor.afbeelding}
                </button>
                <span className="mx-1 h-5 w-px bg-line" />
                {CALLOUT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => voegCalloutIn(type)}
                    className="kb-btn"
                  >
                    {t.editor[CALLOUT_SLEUTEL[type]]}
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
                placeholder={t.editor.inhoudPlaceholder}
                spellCheck={false}
              />
              <p className="text-[11px] text-muted">{t.editor.inhoudTip}</p>
            </div>
          )}

          {tab === 'voorbeeld' && (
            <div className="min-h-[520px] rounded-md border border-line p-5">
              {inhoud.trim() ? (
                <ArtikelMarkdown>{inhoud}</ArtikelMarkdown>
              ) : (
                <p className="kb-empty">{t.editor.geenInhoud}</p>
              )}
            </div>
          )}

          {tab === 'geschiedenis' && (
            <ul className="space-y-2">
              {revisies.length === 0 && <li className="kb-empty">{t.editor.geenVersies}</li>}
              {revisies.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-md border border-line p-3"
                >
                  <div>
                    <div className="text-[13px] font-medium text-ink">{r.title}</div>
                    <div className="text-[11px] text-muted">
                      {new Date(r.saved_at).toLocaleString(TAAL_OPMAAK[taal])}
                      {r.saved_by_naam && ` · ${r.saved_by_naam}`}
                      {r.change_note && ` · ${r.change_note}`}
                    </div>
                  </div>
                  <button onClick={() => zetTerug(r.id)} disabled={bezig} className="kb-btn">
                    {t.editor.terugzetten}
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
            placeholder={t.editor.wijzignotitiePlaceholder}
            className="kb-input w-56"
          />
          <button onClick={bewaar} disabled={bezig || !gewijzigd} className="kb-btn kb-btn-primary">
            {bezig ? t.algemeen.bezig : t.algemeen.opslaan}
          </button>
          <button onClick={markeerControle} disabled={bezig} className="kb-btn">
            {t.editor.markeerGecontroleerd}
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
              {t.editor[optie.sleutel]}
            </button>
          ))}
          {artikel.status !== 'archived' && (
            <button
              onClick={archiveer}
              disabled={bezig}
              className="kb-btn border-negative text-negative hover:bg-[#fdf0ef]"
            >
              {t.editor.archiveren}
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
