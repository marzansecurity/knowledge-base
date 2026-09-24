import { notFound } from 'next/navigation';
import { AutomatiseringBadge } from '@/components/automatisering-badge';
import { KbShell } from '@/components/kb-shell';
import { LandEnTypeVinkjes } from '@/components/leverancier-velden';
import { MultiChipFilter } from '@/components/multi-chip-filter';
import { TaalLink } from '@/components/taal-link';
import { vereisIngelogd } from '@/lib/auth';
import { haalArtikelLinks, haalLeveranciers } from '@/lib/data';
import { statusVan, UITLEG_ARTIKEL, UITLEG_PER_KOLOM } from '@/lib/leveranciers';
import { isTaal, STANDAARD_TAAL } from '@/lib/talen';
import { haalVertalingen, type Berichten } from '@/lib/vertalingen';
import {
  AUTOMATION_STATUSES,
  COUNTRIES,
  SUPPLIER_STEPS,
  SUPPLIER_TYPES,
  type Country,
  type Supplier,
  type SupplierStep,
  type SupplierType,
} from '@/lib/types';
import { maakLeverancier } from './acties';

type Uitleglinks = Partial<Record<SupplierStep | 'carrier', string>>;

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

  const uitlegSlugs = [...new Set(Object.values(UITLEG_PER_KOLOM).map((u) => u.slug))];
  const [leveranciers, artikelLinks] = await Promise.all([
    haalLeveranciers(supabase, {
      countries: geselecteerdeLanden.length > 0 ? geselecteerdeLanden : undefined,
      types: geselecteerdeTypes.length > 0 ? geselecteerdeTypes : undefined,
    }),
    haalArtikelLinks(supabase, uitlegSlugs, taal),
  ]);

  // Alleen linken naar artikelen die bestaan en voor deze lezer zichtbaar zijn;
  // een concept geeft voor een medewerker anders een 404. Het anker hoort bij de
  // Nederlandse koppen, dus in een vertaling landt de lezer bovenaan.
  const uitleg: Uitleglinks = {};
  for (const [kolom, { slug, anker }] of Object.entries(UITLEG_PER_KOLOM)) {
    const artikel = artikelLinks.get(slug);
    if (!artikel) continue;
    uitleg[kolom as keyof Uitleglinks] =
      `/bibliotheek/${artikel.slug}${anker && taal === STANDAARD_TAAL ? `#${anker}` : ''}`;
  }
  const uitlegArtikel = artikelLinks.get(UITLEG_ARTIKEL);

  const heeftFilter = geselecteerdeLanden.length > 0 || geselecteerdeTypes.length > 0;

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-5">
        <div>
          <h1 className="kb-page-title">{t.leveranciers.titel}</h1>
          <p className="mt-1.5 max-w-[720px] text-[13px] leading-relaxed text-muted">
            {t.leveranciers.introTekst}
          </p>
          {uitlegArtikel && (
            <TaalLink
              href={`/bibliotheek/${uitlegArtikel.slug}`}
              className="mt-1.5 inline-block text-[13px] font-medium text-navy-mid hover:text-orange"
            >
              {t.leveranciers.uitlegLink}
            </TaalLink>
          )}
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

        <div className="kb-card overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line bg-page text-left">
                <th className="sticky left-0 z-10 bg-page px-4 py-2.5 kb-label">{t.leveranciers.kolomLeverancier}</th>
                <th className="px-3 py-2.5 kb-label">{t.leveranciers.kolomLand}</th>
                <th className="px-3 py-2.5 kb-label">{t.leveranciers.kolomType}</th>
                {SUPPLIER_STEPS.map((stap) => (
                  <th key={stap} className="px-3 py-2.5 text-center">
                    <KolomKop href={uitleg[stap]} label={t.leveranciers.onderdeel[stap]} t={t} />
                  </th>
                ))}
                <th className="px-3 py-2.5">
                  <KolomKop href={uitleg.carrier} label={t.leveranciers.vervoerder} t={t} />
                </th>
              </tr>
            </thead>
            <tbody>
              {leveranciers.map((s) => (
                <LeverancierRij key={s.id} leverancier={s} t={t} />
              ))}
              {leveranciers.length === 0 && (
                <tr>
                  <td colSpan={8} className="kb-empty">
                    {heeftFilter ? t.leveranciers.geenResultaten : t.leveranciers.nogGeen}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Legenda t={t} />
          <div className="kb-card p-4">
            <div className="kb-section-title mb-2">{t.leveranciers.vervoerdersTitel}</div>
            <div className="kb-callout kb-callout-warning my-0">
              <p>
                {t.leveranciers.vervoerdersTekst}{' '}
                {uitleg.carrier && (
                  <TaalLink href={uitleg.carrier} className="font-semibold underline underline-offset-2">
                    {t.leveranciers.vervoerdersLink}
                  </TaalLink>
                )}
              </p>
            </div>
          </div>
        </div>

        {magBewerken && <NieuweLeverancierFormulier t={t} />}
      </main>
    </KbShell>
  );
}

function KolomKop({ href, label, t }: { href?: string; label: string; t: Berichten }) {
  if (!href) return <span className="kb-label">{label}</span>;
  return (
    <TaalLink
      href={href}
      title={t.leveranciers.watIsDit}
      className="kb-label inline-flex items-center gap-1 whitespace-nowrap text-navy-mid hover:text-orange"
    >
      {label}
      <span
        aria-hidden
        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current text-[9px] leading-none normal-case"
      >
        ?
      </span>
    </TaalLink>
  );
}

function LeverancierRij({ leverancier: s, t }: { leverancier: Supplier; t: Berichten }) {
  return (
    <tr className="group border-b border-line last:border-b-0 hover:bg-[#f7f9fc]">
      <td className="sticky left-0 bg-white px-4 py-2.5 align-top group-hover:bg-[#f7f9fc]">
        <TaalLink href={`/leveranciers/${s.slug}`} className="text-[14px] font-semibold text-navy hover:text-orange">
          {s.name}
        </TaalLink>
        {s.notes && <div className="mt-0.5 max-w-[260px] text-[12px] leading-snug text-muted">{s.notes}</div>}
      </td>
      <td className="px-3 py-2.5 align-top">
        <div className="flex flex-wrap gap-1">
          {s.countries.length === 0 && <span className="text-muted">—</span>}
          {s.countries.map((c) => (
            <span key={c} title={t.labels.land[c]} className="kb-chip px-2 py-0 text-[11px] font-semibold">
              {c}
            </span>
          ))}
        </div>
      </td>
      <td className="px-3 py-2.5 align-top text-ink-soft">
        {s.types.length ? s.types.map((tp) => t.labels.leverancierstype[tp]).join(', ') : <span className="text-muted">—</span>}
      </td>
      {SUPPLIER_STEPS.map((stap) => (
        <td key={stap} className="px-3 py-2.5 text-center align-top">
          <AutomatiseringBadge status={statusVan(s, stap)} t={t} />
          {stap === 'stock_sync' && s.stock_sync_frequency && (
            <div className="mt-1 text-[11px] text-muted">{s.stock_sync_frequency}</div>
          )}
        </td>
      ))}
      <td className="px-3 py-2.5 align-top text-ink-soft">{s.carrier || <span className="text-muted">—</span>}</td>
    </tr>
  );
}

function Legenda({ t }: { t: Berichten }) {
  return (
    <div className="kb-card p-4">
      <div className="kb-section-title mb-2.5">{t.leveranciers.legendaTitel}</div>
      <ul className="grid gap-2 text-[13px] text-ink-soft">
        {[...AUTOMATION_STATUSES, null].map((status) => (
          <li key={status ?? 'onbekend'} className="flex items-start gap-2.5">
            <AutomatiseringBadge status={status} t={t} />
            <span>{t.leveranciers.legenda[status ?? 'onbekend']}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NieuweLeverancierFormulier({ t }: { t: Berichten }) {
  return (
    <form action={maakLeverancier} className="kb-card p-4">
      <div className="kb-section-title mb-1">{t.leveranciers.nieuweTitel}</div>
      <p className="mb-2.5 text-[12px] text-muted">{t.leveranciers.nieuweHint}</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="kb-label mb-1 block">{t.leveranciers.naam}</label>
          <input name="name" required className="kb-input" placeholder={t.leveranciers.naamPlaceholder} />
        </div>
        <LandEnTypeVinkjes t={t} />
        <button type="submit" className="kb-btn kb-btn-accent whitespace-nowrap">
          {t.leveranciers.toevoegen}
        </button>
      </div>
    </form>
  );
}
