import { UitlegKnop } from '@/components/uitleg-knop';
import { landNaam, statusVan, VANUIT_LANDEN } from '@/lib/leveranciers';
import type { KolomUitleg } from '@/lib/leveranciers-uitleg';
import { ArtikelMarkdown } from '@/lib/markdown';
import type { Taal } from '@/lib/talen';
import {
  AUTOMATION_STATUSES,
  SUPPLIER_STEPS,
  SUPPLIER_TYPES,
  type Region,
  type SupplierColumn,
  type SupplierRegion,
  type SupplierType,
} from '@/lib/types';
import type { Berichten } from '@/lib/vertalingen';

export function kolomNaam(kolom: SupplierColumn, t: Berichten) {
  return kolom === 'carrier' ? t.leveranciers.vervoerder : t.leveranciers.onderdeel[kolom];
}

/** Kolomnaam met een ⓘ-knop die de uitleg op dezelfde pagina opent. */
export function KolomKop({
  kolom,
  uitleg,
  t,
  className = '',
}: {
  kolom: SupplierColumn;
  uitleg: KolomUitleg;
  t: Berichten;
  className?: string;
}) {
  const naam = kolomNaam(kolom, t);
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
      <span className="kb-label">{naam}</span>
      <UitlegKnop
        titel={naam}
        openLabel={t.leveranciers.uitlegOpenen.replace('{onderdeel}', naam)}
        sluitLabel={t.algemeen.sluiten}
        artikelHref={uitleg.artikelHref}
        artikelLabel={t.leveranciers.uitlegHeleArtikel}
      >
        {uitleg.markdown ? (
          <ArtikelMarkdown>{uitleg.markdown}</ArtikelMarkdown>
        ) : (
          <p className="py-3 text-[14px] text-muted">{t.leveranciers.uitlegOntbreekt}</p>
        )}
      </UitlegKnop>
    </span>
  );
}

export function TypeVinkjes({ naamPrefix, types = [], t }: { naamPrefix: string; types?: SupplierType[]; t: Berichten }) {
  return (
    <fieldset>
      <legend className="kb-label mb-1">{t.leveranciers.types}</legend>
      <div className="flex flex-wrap gap-3 py-2">
        {SUPPLIER_TYPES.map((tp) => (
          <label key={tp} className="flex items-center gap-1 text-[13px] text-ink-soft">
            <input type="checkbox" name={`${naamPrefix}type_${tp}`} defaultChecked={types.includes(tp)} className="h-3.5 w-3.5" />
            {t.labels.leverancierstype[tp]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function VanuitKeuze({ waarde, taal, t }: { waarde: string | null; taal: Taal; t: Berichten }) {
  return (
    <div>
      <label className="kb-label mb-1 block">{t.leveranciers.vanuit}</label>
      <select name="based_in" defaultValue={waarde ?? ''} className="kb-input">
        <option value="">{t.leveranciers.vanuitOnbekend}</option>
        {VANUIT_LANDEN.map((code) => (
          <option key={code} value={code}>
            {landNaam(code, taal)}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Alle velden van één regio in het bewerkformulier. De veldnamen beginnen met `<regio>_`. */
export function RegioVelden({ regio, gegevens, t }: { regio: Region; gegevens?: SupplierRegion; t: Berichten }) {
  const p = `${regio}_`;
  return (
    <fieldset className="grid gap-3 rounded-lg border border-line p-4">
      <legend className="px-1">
        <label className="flex items-center gap-2 text-[14px] font-semibold text-navy">
          <input type="checkbox" name={`${p}actief`} defaultChecked={Boolean(gegevens)} className="h-4 w-4" />
          {t.leveranciers.regioActief.replace('{regio}', t.labels.regio[regio])}
        </label>
      </legend>
      {gegevens && <p className="-mt-1 text-[12px] text-muted">{t.leveranciers.regioUitvinkenHint}</p>}

      <TypeVinkjes naamPrefix={p} types={gegevens?.types} t={t} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SUPPLIER_STEPS.map((stap) => (
          <div key={stap}>
            <label className="kb-label mb-1 block">{t.leveranciers.onderdeel[stap]}</label>
            <select
              name={`${p}${stap}_status`}
              defaultValue={(gegevens && statusVan(gegevens, stap)) ?? ''}
              className="kb-input"
            >
              <option value="">
                {t.labels.automatisering.onbekend} - {t.leveranciers.legendaKort.onbekend}
              </option>
              {AUTOMATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t.labels.automatisering[status]} - {t.leveranciers.legendaKort[status]}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="kb-label mb-1 block">{t.leveranciers.frequentie}</label>
          <input
            name={`${p}stock_sync_frequency`}
            defaultValue={gegevens?.stock_sync_frequency ?? ''}
            className="kb-input"
            placeholder={t.leveranciers.frequentiePlaceholder}
          />
        </div>
        <div>
          <label className="kb-label mb-1 block">{t.leveranciers.vervoerder}</label>
          <input
            name={`${p}carrier`}
            defaultValue={gegevens?.carrier ?? ''}
            className="kb-input"
            placeholder={t.leveranciers.vervoerderPlaceholder}
          />
        </div>
      </div>

      <div>
        <label className="kb-label mb-1 block">{t.leveranciers.opmerkingen}</label>
        <input
          name={`${p}notes`}
          defaultValue={gegevens?.notes ?? ''}
          className="kb-input"
          placeholder={t.leveranciers.opmerkingenPlaceholder}
        />
      </div>
    </fieldset>
  );
}
