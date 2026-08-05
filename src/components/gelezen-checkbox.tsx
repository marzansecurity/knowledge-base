'use client';

import { useState, useTransition } from 'react';

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

  return (
    <input
      type="checkbox"
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
