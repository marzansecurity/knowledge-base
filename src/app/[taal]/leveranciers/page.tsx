import { notFound } from 'next/navigation';
import { AutomatiseringBadge } from '@/components/automatisering-badge';
import { KbShell } from '@/components/kb-shell';
import { KolomKop, VanuitKeuze } from '@/components/leverancier-velden';
import { MultiChipFilter } from '@/components/multi-chip-filter';
import { TaalLink } from '@/components/taal-link';
import { vereisIngelogd } from '@/lib/auth';
import { haalLeveranciers } from '@/lib/data';
import { landNaam, regioVan, statusVan } from '@/lib/leveranciers';
import { haalKolomUitleg } from '@/lib/leveranciers-uitleg';
import { isTaal, type Taal } from '@/lib/talen';
import { haalVertalingen, type Berichten } from '@/lib/vertalingen';
import {
  AUTOMATION_STATUSES,
  REGIONS,
  SUPPLIER_COLUMNS,
  SUPPLIER_TYPES,
  type Region,
  type Supplier,
  type SupplierRegion,
  type SupplierType,
} from '@/lib/types';
import { maakLeverancier } from './acties';

export default async function LeveranciersPagina({
  params,
  searchParams,
}: PageProps<'/[taal]/leveranciers'>) {
  const { taal } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);

  const { supabase, profiel } = await vereisIngelogd();
  const magBewerken = profiel?.role === 'admin' || profiel?.role === 'editor';

  const { regio: regioParam, type } = await searchParams;
  const regio: Region = REGIONS.includes(regioParam as Region) ? (regioParam as Region) : 'nlbe';
  const geselecteerdeTypes = (typeof type === 'string' ? type.split(',').filter(Boolean) : []) as SupplierType[];

  const [alle, uitleg] = await Promise.all([haalLeveranciers(supabase), haalKolomUitleg(supabase, taal)]);

  const inRegio = alle.filter((s) => regioVan(s, regio));
  const leveranciers = inRegio.filter(
    (s) => geselecteerdeTypes.length === 0 || regioVan(s, regio)!.types.some((tp) => geselecteerdeTypes.includes(tp)),
  );

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-5">
        <div>
          <h1 className="kb-page-title">{t.leveranciers.titel}</h1>
          <p className="mt-1.5 max-w-[720px] text-[13px] leading-relaxed text-muted">
            {t.leveranciers.introTekst}
          </p>
        </div>

        <div className="kb-card overflow-hidden">
          <RegioTabs
            actief={regio}
            aantallen={Object.fromEntries(REGIONS.map((r) => [r, alle.filter((s) => regioVan(s, r)).length]))}
            type={typeof type === 'string' ? type : undefined}
            t={t}
          />

          <div className="grid gap-3 border-b border-line px-4 py-3">
            <MultiChipFilter
              label={t.leveranciers.filterType}
              wisLabel={t.leveranciers.filterWissen}
              paramNaam="type"
              basisPad="/leveranciers"
              opties={SUPPLIER_TYPES.map((tp) => ({ waarde: tp, label: t.labels.leverancierstype[tp] }))}
            />
            <Legenda t={t} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line bg-page text-left">
                  <th className="sticky left-0 z-10 bg-page px-4 py-2.5">
                    <span className="kb-label">{t.leveranciers.kolomLeverancier}</span>
                  </th>
                  <th className="px-3 py-2.5">
                    <span className="kb-label">{t.leveranciers.kolomVanuit}</span>
                  </th>
                  <th className="px-3 py-2.5">
                    <span className="kb-label">{t.leveranciers.kolomType}</span>
                  </th>
                  {SUPPLIER_COLUMNS.map((kolom) => (
                    <th key={kolom} className={`px-3 py-2.5 ${kolom === 'carrier' ? 'text-left' : 'text-center'}`}>
                      <KolomKop kolom={kolom} uitleg={uitleg[kolom]} t={t} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leveranciers.map((s) => (
                  <LeverancierRij key={s.id} leverancier={s} gegevens={regioVan(s, regio)!} taal={taal} t={t} />
                ))}
                {leveranciers.length === 0 && (
                  <tr>
                    <td colSpan={3 + SUPPLIER_COLUMNS.length} className="kb-empty">
                      {inRegio.length > 0
                        ? t.leveranciers.geenResultaten
                        : t.leveranciers.geenInRegio.replace('{regio}', t.labels.regio[regio])}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="kb-card p-4">
          <div className="kb-section-title mb-2">{t.leveranciers.vervoerdersTitel}</div>
          <div className="kb-callout kb-callout-warning my-0">
            <p>{t.leveranciers.vervoerdersTekst}</p>
          </div>
        </div>

        {magBewerken && <NieuweLeverancierFormulier regio={regio} taal={taal} t={t} />}
      </main>
    </KbShell>
  );
}

function RegioTabs({
  actief,
  aantallen,
  type,
  t,
}: {
  actief: Region;
  aantallen: Record<string, number>;
  type?: string;
  t: Berichten;
}) {
  return (
    <nav className="flex gap-1 border-b border-line px-3 pt-2" aria-label={t.leveranciers.actiefIn}>
      {REGIONS.map((r) => {
        const isActief = r === actief;
        const query = new URLSearchParams({ regio: r, ...(type ? { type } : {}) });
        return (
          <TaalLink
            key={r}
            href={`/leveranciers?${query}`}
            aria-current={isActief ? 'page' : undefined}
            className={`-mb-px flex items-center gap-2 border-b-[3px] px-3.5 py-2.5 text-[14px] transition-colors ${
              isActief
                ? 'border-orange font-semibold text-navy'
                : 'border-transparent text-muted hover:text-navy'
            }`}
          >
            {t.labels.regio[r]}
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                isActief ? 'bg-navy text-white' : 'bg-page text-muted'
              }`}
            >
              {aantallen[r] ?? 0}
            </span>
          </TaalLink>
        );
      })}
    </nav>
  );
}

function Legenda({ t }: { t: Berichten }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted">
      {[...AUTOMATION_STATUSES, null].map((status) => (
        <span key={status ?? 'onbekend'} className="inline-flex items-center gap-1.5">
          <AutomatiseringBadge status={status} t={t} compact />
          {t.leveranciers.legendaKort[status ?? 'onbekend']}
        </span>
      ))}
    </div>
  );
}

function LeverancierRij({
  leverancier: s,
  gegevens: r,
  taal,
  t,
}: {
  leverancier: Supplier;
  gegevens: SupplierRegion;
  taal: Taal;
  t: Berichten;
}) {
  // Eigen voorraad (PON) in een eigen tint, zodat die er in één oogopslag uitspringt.
  const achtergrond = s.own_stock ? 'bg-[#eaf4fb]' : 'bg-white';
  return (
    <tr className={`group border-b border-line last:border-b-0 ${achtergrond} hover:bg-[#f2f6fa]`}>
      <td
        className={`sticky left-0 px-4 py-2.5 align-top group-hover:bg-[#f2f6fa] ${achtergrond} ${
          s.own_stock ? 'border-l-4 border-l-navy-mid' : ''
        }`}
      >
        <TaalLink href={`/leveranciers/${s.slug}`} className="text-[14px] font-semibold text-navy hover:text-orange">
          {s.name}
        </TaalLink>
        {s.own_stock && (
          <span className="ml-2 rounded-full bg-navy-mid px-2 py-0.5 text-[10px] font-bold tracking-[0.04em] text-white uppercase">
            {t.leveranciers.eigenVoorraad}
          </span>
        )}
        {r.notes && <div className="mt-0.5 max-w-[280px] text-[12px] leading-snug text-muted">{r.notes}</div>}
      </td>
      <td className="px-3 py-2.5 align-top whitespace-nowrap text-ink-soft">
        {s.based_in ? landNaam(s.based_in, taal) : <span className="text-muted">?</span>}
      </td>
      <td className="px-3 py-2.5 align-top text-ink-soft">
        {r.types.length ? (
          <div className="flex flex-col gap-0.5">
            {r.types.map((tp) => (
              <span key={tp} className="whitespace-nowrap">
                {t.labels.leverancierstype[tp]}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-muted">-</span>
        )}
      </td>
      {SUPPLIER_COLUMNS.map((kolom) =>
        kolom === 'carrier' ? (
          <td key={kolom} className="px-3 py-2.5 align-top text-ink-soft">
            {r.carrier || <span className="text-muted">-</span>}
          </td>
        ) : (
          <td key={kolom} className="px-3 py-2.5 text-center align-top">
            <AutomatiseringBadge status={statusVan(r, kolom)} t={t} />
            {kolom === 'stock_sync' && r.stock_sync_frequency && (
              <div className="mt-1 text-[11px] text-muted">{r.stock_sync_frequency}</div>
            )}
          </td>
        ),
      )}
    </tr>
  );
}

function NieuweLeverancierFormulier({ regio, taal, t }: { regio: Region; taal: Taal; t: Berichten }) {
  return (
    <form action={maakLeverancier} className="kb-card p-4">
      <div className="kb-section-title mb-1">{t.leveranciers.nieuweTitel}</div>
      <p className="mb-2.5 text-[12px] text-muted">{t.leveranciers.nieuweHint}</p>
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[200px] flex-1">
          <label className="kb-label mb-1 block">{t.leveranciers.naam}</label>
          <input name="name" required className="kb-input" placeholder={t.leveranciers.naamPlaceholder} />
        </div>
        <div className="min-w-[180px]">
          <VanuitKeuze waarde={null} taal={taal} t={t} />
        </div>
        <fieldset>
          <legend className="kb-label mb-1">{t.leveranciers.actiefIn}</legend>
          <div className="flex flex-wrap gap-3 py-2">
            {REGIONS.map((r) => (
              <label key={r} className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                <input type="checkbox" name={`regio_${r}`} defaultChecked={r === regio} className="h-3.5 w-3.5" />
                {t.labels.regio[r]}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="kb-btn kb-btn-accent whitespace-nowrap">
          {t.leveranciers.toevoegen}
        </button>
      </div>
    </form>
  );
}
