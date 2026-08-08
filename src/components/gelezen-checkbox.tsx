'use client';

import { useState, useTransition } from 'react';
import { useVertalingen } from '@/components/vertaling-provider';

export function GelezenCheckbox({
  articleId,
  initieelGelezen,
  zetGelezenStatus,
}: {
  articleId: string;
  initieelGelezen: boolean;
  zetGelezenStatus: (articleId: string, gelezen: boolean) => Promise<void>;
}) {
  const [gelezen, setGelezen] = useState(initieelGelezen);
  const [, startTransitie] = useTransition();
  const { berichten: t } = useVertalingen();

  return (
    <input
      type="checkbox"
      aria-label={t.onboarding.markeerGelezen}
      checked={gelezen}
      onChange={(e) => {
        const nieuw = e.target.checked;
        setGelezen(nieuw);
        startTransitie(() => zetGelezenStatus(articleId, nieuw));
      }}
      className="h-4 w-4 shrink-0"
    />
  );
}
