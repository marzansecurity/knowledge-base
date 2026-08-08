import { notFound } from 'next/navigation';
import { KbShell } from '@/components/kb-shell';
import { MultiChipFilter } from '@/components/multi-chip-filter';
import { vereisIngelogd } from '@/lib/auth';
import { haalLeveranciers } from '@/lib/data';
import { isTaal, TAAL_OPMAAK, type Taal } from '@/lib/talen';
import { haalVertalingen, type Berichten } from '@/lib/vertalingen';
import {
  COUNTRIES,
  SUPPLIER_TYPES,
  type Country,
  type Supplier,
  type SupplierType,
} from '@/lib/types';
import { maakLeverancier, bewaarLeverancier, verwijderLeverancier } from './acties';

export default async function LeveranciersPagina({
  params,
  searchParams,
}: PageProps<'/[taal]/leveranciers'>) {
  const { taal } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);

  const { supabase, profiel } = await vereisIngelogd();
  const magBewerken = profiel?.role === 'admin' || profiel?.role === 'editor';

  const { land, type } = await searchParams;
  const geselecteerdeLanden = (typeof land === 'string' ? land.split(',').filter(Boolean) : []) as Country[];
  const geselecteerdeTypes = (typeof type === 'string' ? type.split(',').filter(Boolean) : []) as SupplierType[];

  const leveranciers = await haalLeveranciers(supabase, {
    countries: geselecteerdeLanden.length > 0 ? geselecteerdeLanden : undefined,
    types: geselecteerdeTypes.length > 0 ? geselecteerdeTypes : undefined,
  });

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-5">
        <div>
          <h1 className="kb-page-title">{t.leveranciers.titel}</h1>
          <p className="mt-1.5 max-w-[720px] text-[13px] leading-relaxed text-muted">
            {t.leveranciers.introTekst}
          </p>
        </div>

        <div className="kb-card grid gap-2.5 p-4">
          <MultiChipFilter
            label={t.leveranciers.filterLand}
            wisLabel={t.leveranciers.filterWissen}
            paramNaam="land"
            basisPad="/leveranciers"
            opties={COUNTRIES.map((c) => ({ waarde: c, label: t.labels.land[c] }))}
          />
          <MultiChipFilter
            label={t.leveranciers.filterType}
            wisLabel={t.leveranciers.filterWissen}
            paramNaam="type"
            basisPad="/leveranciers"
            opties={SUPPLIER_TYPES.map((tp) => ({ waarde: tp, label: t.labels.leverancierstype[tp] }))}
          />
        </div>

        {magBewerken && <NieuweLeverancierFormulier t={t} />}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {leveranciers.map((s) =>
            magBewerken ? (
              <LeverancierBewerkKaart key={s.id} leverancier={s} taal={taal} t={t} />
            ) : (
              <LeverancierKaart key={s.id} leverancier={s} t={t} />
            ),
          )}

          {leveranciers.length === 0 && (
            <div className="kb-card kb-empty lg:col-span-2">
              {geselecteerdeLanden.length > 0 || geselecteerdeTypes.length > 0
                ? t.leveranciers.geenResultaten
                : t.leveranciers.nogGeen}
            </div>
          )}
        </div>
      </main>
    </KbShell>
  );
}

function LandenChips({ countries, t }: { countries: Country[]; t: Berichten }) {
  return (
    <div className="flex flex-wrap gap-1">
      {countries.length === 0 && <span className="text-[12px] text-muted">—</span>}
      {countries.map((c) => (
        <span key={c} className="kb-chip py-0.5 text-[12px]">
          {t.labels.land[c]}
        </span>
      ))}
    </div>
  );
}

function TypeChips({ types, t }: { types: SupplierType[]; t: Berichten }) {
  if (types.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {types.map((tp) => (
        <span key={tp} className="kb-chip border-navy-mid py-0.5 text-[12px] text-navy-mid">
          {t.labels.leverancierstype[tp]}
        </span>
      ))}
    </div>
  );
}

function JaNee({ waar, t }: { waar: boolean; t: Berichten }) {
  return (
    <span className={`text-[13px] font-semibold ${waar ? 'text-[#1d5c46]' : 'text-muted'}`}>
      {waar ? t.leveranciers.ja : t.leveranciers.nee}
    </span>
  );
}

function LeverancierKaart({ leverancier: s, t }: { leverancier: Supplier; t: Berichten }) {
  return (
    <div className="kb-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="text-[15px] font-semibold text-navy">{s.name}</div>
        <div className="flex flex-col items-end gap-1">
          <LandenChips countries={s.countries} t={t} />
          <TypeChips types={s.types} t={t} />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-3 text-[13px]">
        <div>
          <div className="kb-label">{t.leveranciers.vervoerder}</div>
          <div className="text-ink-soft">{s.carrier || '—'}</div>
        </div>
        <div>
          <div className="kb-label">{t.leveranciers.tracking}</div>
          <JaNee waar={s.tracking_available} t={t} />
        </div>
        <div>
          <div className="kb-label">{t.leveranciers.automatisch}</div>
          <JaNee waar={s.tracking_automatic} t={t} />
        </div>
      </div>
      {s.notes && <p className="mt-2 text-[13px] text-muted">{s.notes}</p>}
    </div>
  );
}

function LeverancierBewerkKaart({
  leverancier: s,
  taal,
  t,
}: {
  leverancier: Supplier;
  taal: Taal;
  t: Berichten;
}) {
  return (
    <form action={bewaarLeverancier.bind(null, s.id)} className="kb-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <input name="name" defaultValue={s.name} required className="kb-input w-auto min-w-[160px] flex-1" />
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map((c) => (
            <label key={c} className="flex items-center gap-1 text-[12px] text-ink-soft">
              <input type="checkbox" name={`country_${c}`} defaultChecked={s.countries.includes(c)} className="h-3.5 w-3.5" />
              {c}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-3">
        {SUPPLIER_TYPES.map((tp) => (
          <label key={tp} className="flex items-center gap-1.5 text-[12px] text-ink-soft">
            <input type="checkbox" name={`type_${tp}`} defaultChecked={s.types.includes(tp)} className="h-3.5 w-3.5" />
            {t.labels.leverancierstype[tp]}
          </label>
        ))}
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div>
          <label className="kb-label mb-1 block">{t.leveranciers.vervoerder}</label>
          <input
            name="carrier"
            defaultValue={s.carrier ?? ''}
            className="kb-input"
            placeholder={t.leveranciers.vervoerderPlaceholder}
          />
        </div>
        <label className="mt-5 flex items-center gap-1.5 text-[13px] text-ink-soft">
          <input type="checkbox" name="tracking_available" defaultChecked={s.tracking_available} className="h-3.5 w-3.5" />
          {t.leveranciers.trackingBeschikbaar}
        </label>
        <label className="mt-5 flex items-center gap-1.5 text-[13px] text-ink-soft">
          <input type="checkbox" name="tracking_automatic" defaultChecked={s.tracking_automatic} className="h-3.5 w-3.5" />
          {t.leveranciers.automatischBinnen}
        </label>
      </div>

      <div className="mt-2.5">
        <label className="kb-label mb-1 block">{t.leveranciers.opmerkingen}</label>
        <input name="notes" defaultValue={s.notes ?? ''} className="kb-input" />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="text-[12px] text-muted">
          {s.reviewed_at
            ? t.leveranciers.laatstGecontroleerd.replace(
                '{datum}',
                new Date(s.reviewed_at).toLocaleDateString(TAAL_OPMAAK[taal], {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }),
              )
            : t.leveranciers.nietGecontroleerd}
        </span>
        <div className="flex gap-2">
          <button type="submit" className="kb-btn kb-btn-primary">
            {t.algemeen.opslaan}
          </button>
          <button formAction={verwijderLeverancier.bind(null, s.id)} className="kb-btn border-negative text-negative">
            {t.algemeen.verwijderen}
          </button>
        </div>
      </div>
    </form>
  );
}

function NieuweLeverancierFormulier({ t }: { t: Berichten }) {
  return (
    <form action={maakLeverancier} className="kb-card p-4">
      <div className="kb-section-title mb-2.5">{t.leveranciers.nieuweTitel}</div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <label className="kb-label mb-1 block">{t.leveranciers.naam}</label>
          <input name="name" required className="kb-input" placeholder={t.leveranciers.naamPlaceholder} />
        </div>
        <div className="flex gap-2">
          {COUNTRIES.map((c) => (
            <label key={c} className="flex items-center gap-1 text-[12px] text-ink-soft">
              <input type="checkbox" name={`country_${c}`} className="h-3.5 w-3.5" />
              {c}
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          {SUPPLIER_TYPES.map((tp) => (
            <label key={tp} className="flex items-center gap-1 text-[12px] text-ink-soft">
              <input type="checkbox" name={`type_${tp}`} className="h-3.5 w-3.5" />
              {t.labels.leverancierstype[tp]}
            </label>
          ))}
        </div>
        <div className="min-w-[140px]">
          <label className="kb-label mb-1 block">{t.leveranciers.vervoerder}</label>
          <input name="carrier" className="kb-input" placeholder={t.leveranciers.vervoerderPlaceholderNieuw} />
        </div>
        <label className="flex items-center gap-1.5 text-[13px] text-ink-soft">
          <input type="checkbox" name="tracking_available" className="h-3.5 w-3.5" />
          {t.leveranciers.tracking}
        </label>
        <label className="flex items-center gap-1.5 text-[13px] text-ink-soft">
          <input type="checkbox" name="tracking_automatic" className="h-3.5 w-3.5" />
          {t.leveranciers.automatisch}
        </label>
        <button type="submit" className="kb-btn kb-btn-accent whitespace-nowrap">
          {t.leveranciers.toevoegen}
        </button>
      </div>
    </form>
  );
}
