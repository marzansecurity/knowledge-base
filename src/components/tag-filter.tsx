'use client';

import { TaalLink } from '@/components/taal-link';
import { useSearchParams } from 'next/navigation';
import { useVertalingen } from '@/components/vertaling-provider';
import type { Tag } from '@/lib/types';

export function TagFilter({ tags, basisPad }: { tags: Tag[]; basisPad: string }) {
  const zoekParams = useSearchParams();
  const { berichten: t } = useVertalingen();
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
      {tags.map((tag) => (
        <TaalLink
          key={tag.id}
          href={hrefVoor(tag.name)}
          className={`kb-chip ${actief.has(tag.name) ? 'kb-chip-active' : ''}`}
        >
          {tag.label}
        </TaalLink>
      ))}
      {actief.size > 0 && (
        <TaalLink href={basisPad} className="kb-chip border-negative text-negative hover:bg-[#fdf0ef]">
          {t.bibliotheek.filtersWissen}
        </TaalLink>
      )}
    </div>
  );
}
