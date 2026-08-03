import type { ArticleStatus } from '@/lib/types';
import { STATUS_LABEL } from '@/lib/types';

const STIJL: Record<ArticleStatus, string> = {
  draft: 'border-amber text-amber bg-[#fffbf5]',
  published: 'border-teal text-teal bg-[#f0faf6]',
  outdated: 'border-orange text-orange bg-[#fff8f3]',
  archived: 'border-muted text-muted bg-page',
};

export function StatusBadge({ status }: { status: ArticleStatus }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${STIJL[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
