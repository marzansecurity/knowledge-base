'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Tag } from '@/lib/types';

export function TagFilter({ tags, basisPad }: { tags: Tag[]; basisPad: string }) {
  const zoekParams = useSearchParams();
  const actief = new Set((zoekParams.get('tags') ?? '').split(',').filter(Boolean));

  function hrefVoor(naam: string) {
    const params = new URLSearchParams(zoekParams.toString());
    const nieuw = new Set(actief);
    if (nieuw.has(naam)) nieuw.delete(naam);
    else nieuw.add(naam);
    if (nieuw.size > 0) params.set('tags', [...nieuw].join(','));
    else params.delete('tags');
    return `${basisPad}?${params.toString()}`;
  }

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <Link
          key={t.id}
          href={hrefVoor(t.name)}
          className={`kb-chip ${actief.has(t.name) ? 'kb-chip-active' : ''}`}
        >
          {t.name}
        </Link>
      ))}
      {actief.size > 0 && (
        <Link href={basisPad} className="kb-chip border-negative text-negative hover:bg-[#fdf0ef]">
          Filters wissen
        </Link>
      )}
    </div>
  );
}
