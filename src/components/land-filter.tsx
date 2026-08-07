'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { COUNTRIES, COUNTRY_LABEL } from '@/lib/types';

export function LandFilter({ basisPad }: { basisPad: string }) {
  const zoekParams = useSearchParams();
  const actief = new Set((zoekParams.get('land') ?? '').split(',').filter(Boolean));

  function hrefVoor(land: string) {
    const params = new URLSearchParams(zoekParams.toString());
    const nieuw = new Set(actief);
    if (nieuw.has(land)) nieuw.delete(land);
    else nieuw.add(land);
    if (nieuw.size > 0) params.set('land', [...nieuw].join(','));
    else params.delete('land');
    return `${basisPad}?${params.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="kb-label">Land:</span>
      {COUNTRIES.map((land) => (
        <Link key={land} href={hrefVoor(land)} className={`kb-chip ${actief.has(land) ? 'kb-chip-active' : ''}`}>
          {COUNTRY_LABEL[land]}
        </Link>
      ))}
      {actief.size > 0 && (
        <Link href={basisPad} className="kb-chip border-negative text-negative hover:bg-[#fdf0ef]">
          Filter wissen
        </Link>
      )}
    </div>
  );
}
