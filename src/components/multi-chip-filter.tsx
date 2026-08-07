'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

/** Generieke, los-combineerbare chip-filter op een query-parameter (bv. land of type). */
export function MultiChipFilter({
  label,
  paramNaam,
  opties,
  basisPad,
}: {
  label: string;
  paramNaam: string;
  opties: { waarde: string; label: string }[];
  basisPad: string;
}) {
  const zoekParams = useSearchParams();
  const actief = new Set((zoekParams.get(paramNaam) ?? '').split(',').filter(Boolean));

  function hrefVoor(waarde: string) {
    const params = new URLSearchParams(zoekParams.toString());
    const nieuw = new Set(actief);
    if (nieuw.has(waarde)) nieuw.delete(waarde);
    else nieuw.add(waarde);
    if (nieuw.size > 0) params.set(paramNaam, [...nieuw].join(','));
    else params.delete(paramNaam);
    return `${basisPad}?${params.toString()}`;
  }

  function hrefZonderFilter() {
    const params = new URLSearchParams(zoekParams.toString());
    params.delete(paramNaam);
    return params.toString() ? `${basisPad}?${params.toString()}` : basisPad;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="kb-label">{label}:</span>
      {opties.map((o) => (
        <Link key={o.waarde} href={hrefVoor(o.waarde)} className={`kb-chip ${actief.has(o.waarde) ? 'kb-chip-active' : ''}`}>
          {o.label}
        </Link>
      ))}
      {actief.size > 0 && (
        <Link href={hrefZonderFilter()} className="kb-chip border-negative text-negative hover:bg-[#fdf0ef]">
          Wissen
        </Link>
      )}
    </div>
  );
}
