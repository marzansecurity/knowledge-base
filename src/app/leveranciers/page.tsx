import { KbShell } from '@/components/kb-shell';
import { LandFilter } from '@/components/land-filter';
import { vereisIngelogd } from '@/lib/auth';
import { haalLeveranciers } from '@/lib/data';
import { COUNTRIES, COUNTRY_LABEL, type Country, type Supplier } from '@/lib/types';
import { maakLeverancier, bewaarLeverancier, verwijderLeverancier } from './acties';

export default async function LeveranciersPagina({
  searchParams,
}: {
  searchParams: Promise<{ land?: string }>;
}) {
  const { supabase, profiel } = await vereisIngelogd();
  const magBewerken = profiel?.role === 'admin' || profiel?.role === 'editor';

  const { land } = await searchParams;
  const geselecteerdeLanden = (land?.split(',').filter(Boolean) ?? []) as Country[];

  const leveranciers = await haalLeveranciers(supabase, {
    countries: geselecteerdeLanden.length > 0 ? geselecteerdeLanden : undefined,
  });

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-5">
        <div>
          <h1 className="kb-page-title">Leveranciers</h1>
          <p className="mt-1.5 max-w-[720px] text-[13px] leading-relaxed text-muted">
            Welke vervoerder elke leverancier gebruikt, en of tracking (automatisch) beschikbaar is — voor
            NL, BE en UK in één overzicht, zodat support niet tussen twee lijsten hoeft te schakelen.
          </p>
        </div>

        <div className="kb-card p-4">
          <LandFilter basisPad="/leveranciers" />
        </div>

        {magBewerken && <NieuweLeverancierFormulier />}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {leveranciers.map((s) =>
            magBewerken ? (
              <LeverancierBewerkKaart key={s.id} leverancier={s} />
            ) : (
              <LeverancierKaart key={s.id} leverancier={s} />
            ),
          )}

          {leveranciers.length === 0 && (
            <div className="kb-card kb-empty lg:col-span-2">
              {geselecteerdeLanden.length > 0
                ? 'Geen leveranciers gevonden voor dit filter.'
                : 'Nog geen leveranciers toegevoegd.'}
            </div>
          )}
        </div>
      </main>
    </KbShell>
  );
}

function LandenChips({ countries }: { countries: Country[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {countries.length === 0 && <span className="text-[12px] text-muted">—</span>}
      {countries.map((c) => (
        <span key={c} className="kb-chip py-0.5 text-[12px]">
          {COUNTRY_LABEL[c]}
        </span>
      ))}
    </div>
  );
}

function JaNee({ waar }: { waar: boolean }) {
  return (
    <span className={`text-[13px] font-semibold ${waar ? 'text-[#1d5c46]' : 'text-muted'}`}>
      {waar ? 'Ja' : 'Nee'}
    </span>
  );
}

function LeverancierKaart({ leverancier: s }: { leverancier: Supplier }) {
  return (
    <div className="kb-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="text-[15px] font-semibold text-navy">{s.name}</div>
        <LandenChips countries={s.countries} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-3 text-[13px]">
        <div>
          <div className="kb-label">Vervoerder</div>
          <div className="text-ink-soft">{s.carrier || '—'}</div>
        </div>
        <div>
          <div className="kb-label">Tracking</div>
          <JaNee waar={s.tracking_available} />
        </div>
        <div>
          <div className="kb-label">Automatisch</div>
          <JaNee waar={s.tracking_automatic} />
        </div>
      </div>
      {s.notes && <p className="mt-2 text-[13px] text-muted">{s.notes}</p>}
    </div>
  );
}

function LeverancierBewerkKaart({ leverancier: s }: { leverancier: Supplier }) {
  return (
    <form action={bewaarLeverancier.bind(null, s.id)} className="kb-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <input name="name" defaultValue={s.name} required className="kb-input w-auto min-w-[160px] flex-1" />
        <div className="flex gap-2">
          {COUNTRIES.map((c) => (
            <label key={c} className="flex items-center gap-1 text-[12px] text-ink-soft">
              <input type="checkbox" name={`country_${c}`} defaultChecked={s.countries.includes(c)} className="h-3.5 w-3.5" />
              {c}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div>
          <label className="kb-label mb-1 block">Vervoerder</label>
          <input name="carrier" defaultValue={s.carrier ?? ''} className="kb-input" placeholder="bv. DPD" />
        </div>
        <label className="mt-5 flex items-center gap-1.5 text-[13px] text-ink-soft">
          <input type="checkbox" name="tracking_available" defaultChecked={s.tracking_available} className="h-3.5 w-3.5" />
          Tracking beschikbaar
        </label>
        <label className="mt-5 flex items-center gap-1.5 text-[13px] text-ink-soft">
          <input type="checkbox" name="tracking_automatic" defaultChecked={s.tracking_automatic} className="h-3.5 w-3.5" />
          Automatisch bij ons binnen
        </label>
      </div>

      <div className="mt-2.5">
        <label className="kb-label mb-1 block">Opmerkingen</label>
        <input name="notes" defaultValue={s.notes ?? ''} className="kb-input" />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="text-[12px] text-muted">
          {s.reviewed_at
            ? `Laatst gecontroleerd: ${new Date(s.reviewed_at).toLocaleDateString('nl-NL', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}`
            : 'Nog niet gecontroleerd'}
        </span>
        <div className="flex gap-2">
          <button type="submit" className="kb-btn kb-btn-primary">
            Opslaan
          </button>
          <button formAction={verwijderLeverancier.bind(null, s.id)} className="kb-btn border-negative text-negative">
            Verwijderen
          </button>
        </div>
      </div>
    </form>
  );
}

function NieuweLeverancierFormulier() {
  return (
    <form action={maakLeverancier} className="kb-card p-4">
      <div className="kb-section-title mb-2.5">Nieuwe leverancier toevoegen</div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <label className="kb-label mb-1 block">Naam</label>
          <input name="name" required className="kb-input" placeholder="Leveranciersnaam" />
        </div>
        <div className="flex gap-2">
          {COUNTRIES.map((c) => (
            <label key={c} className="flex items-center gap-1 text-[12px] text-ink-soft">
              <input type="checkbox" name={`country_${c}`} className="h-3.5 w-3.5" />
              {c}
            </label>
          ))}
        </div>
        <div className="min-w-[140px]">
          <label className="kb-label mb-1 block">Vervoerder</label>
          <input name="carrier" className="kb-input" placeholder="bv. PostNL" />
        </div>
        <label className="flex items-center gap-1.5 text-[13px] text-ink-soft">
          <input type="checkbox" name="tracking_available" className="h-3.5 w-3.5" />
          Tracking
        </label>
        <label className="flex items-center gap-1.5 text-[13px] text-ink-soft">
          <input type="checkbox" name="tracking_automatic" className="h-3.5 w-3.5" />
          Automatisch
        </label>
        <button type="submit" className="kb-btn kb-btn-accent whitespace-nowrap">
          + Toevoegen
        </button>
      </div>
    </form>
  );
}
