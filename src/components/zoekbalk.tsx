'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { pad } from '@/lib/paden';
import { useVertalingen } from '@/components/vertaling-provider';

export function Zoekbalk({ basisPad }: { basisPad: string }) {
  const router = useRouter();
  const zoekParams = useSearchParams();
  const [waarde, setWaarde] = useState(zoekParams.get('q') ?? '');
  const [, startTransitie] = useTransition();
  const { taal, berichten: t } = useVertalingen();

  function verstuur(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(zoekParams.toString());
    if (waarde.trim()) params.set('q', waarde.trim());
    else params.delete('q');
    startTransitie(() => router.push(`${pad(taal, basisPad)}?${params.toString()}`));
  }

  return (
    <form onSubmit={verstuur} className="flex gap-2">
      <input
        type="search"
        value={waarde}
        onChange={(e) => setWaarde(e.target.value)}
        placeholder={t.bibliotheek.zoekPlaceholder}
        className="kb-input"
      />
      <button type="submit" className="kb-btn kb-btn-primary whitespace-nowrap">
        {t.algemeen.zoeken}
      </button>
    </form>
  );
}
