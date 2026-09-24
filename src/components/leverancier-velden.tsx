import { COUNTRIES, SUPPLIER_TYPES, type Country, type SupplierType } from '@/lib/types';
import type { Berichten } from '@/lib/vertalingen';

/** Vinkjes voor landen en types; gedeeld door het toevoeg- en het bewerkformulier. */
export function LandEnTypeVinkjes({
  t,
  landen = [],
  types = [],
}: {
  t: Berichten;
  landen?: Country[];
  types?: SupplierType[];
}) {
  return (
    <>
      <fieldset>
        <legend className="kb-label mb-1">{t.leveranciers.landen}</legend>
        <div className="flex gap-3 py-2">
          {COUNTRIES.map((c) => (
            <label key={c} className="flex items-center gap-1 text-[13px] text-ink-soft">
              <input type="checkbox" name={`country_${c}`} defaultChecked={landen.includes(c)} className="h-3.5 w-3.5" />
              {c}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="kb-label mb-1">{t.leveranciers.types}</legend>
        <div className="flex flex-wrap gap-3 py-2">
          {SUPPLIER_TYPES.map((tp) => (
            <label key={tp} className="flex items-center gap-1 text-[13px] text-ink-soft">
              <input type="checkbox" name={`type_${tp}`} defaultChecked={types.includes(tp)} className="h-3.5 w-3.5" />
              {t.labels.leverancierstype[tp]}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
