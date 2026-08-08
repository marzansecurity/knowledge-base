'use client';

import { TaalLink } from '@/components/taal-link';
import { useVertalingen } from '@/components/vertaling-provider';
import { TAAL_OPMAAK } from '@/lib/talen';
import type { ArticleSummary } from '@/lib/types';

const STATUS_STIJL: Record<string, string> = {
  draft: 'border-amber text-amber bg-[#fffbf5]',
  published: 'border-teal text-teal bg-[#f0faf6]',
  outdated: 'border-orange text-orange bg-[#fff8f3]',
  archived: 'border-muted text-muted bg-page',
};

export function ArtikelKaart({
  artikel,
  toonStatus = false,
}: {
  artikel: ArticleSummary;
  toonStatus?: boolean;
}) {
  const { taal, berichten: t } = useVertalingen();

  return (
    <TaalLink href={`/bibliotheek/${artikel.slug}`} className="kb-card block p-4 transition-shadow hover:shadow-[0_2px_10px_rgba(16,57,91,.12)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[16px] font-semibold text-navy">{artikel.title}</h3>
        {toonStatus && (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${STATUS_STIJL[artikel.status]}`}
          >
            {t.labels.status[artikel.status]}
          </span>
        )}
      </div>
      {artikel.summary && (
        <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-muted">{artikel.summary}</p>
      )}
      {artikel.reviewed_at && (
        <p className="mt-2 text-[12px] text-muted">
          {t.artikel.laatstGecontroleerd}{' '}
          {new Date(artikel.reviewed_at).toLocaleDateString(TAAL_OPMAAK[taal], {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      )}
    </TaalLink>
  );
}
