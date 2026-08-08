'use client';

import { useState, useTransition } from 'react';
import { genereerVoorstellen } from './acties';

export function GenereerKnop() {
  const [bezig, startTransitie] = useTransition();
  const [melding, setMelding] = useState<{ tekst: string; fout: boolean } | null>(null);

  function verstuur() {
    setMelding(null);
    startTransitie(async () => {
      const resultaat = await genereerVoorstellen();
      if (resultaat.fout) setMelding({ tekst: resultaat.fout, fout: true });
      else setMelding({ tekst: resultaat.succes ?? 'Klaar.', fout: false });
    });
  }

  return (
    <div className="kb-card p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="kb-section-title">Voorstellen genereren</div>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            Laat de AI de openstaande escalaties bekijken en herhaalde patronen voorstellen als
            concept-artikel. Ze verzint hierbij nooit de procedure zelf.
          </p>
        </div>
        <button type="button" onClick={verstuur} disabled={bezig} className="kb-btn kb-btn-primary whitespace-nowrap">
          {bezig ? 'Bezig met analyseren…' : 'Genereer voorstellen'}
        </button>
      </div>
      {melding && (
        <p className={`mt-2 text-[12px] ${melding.fout ? 'text-negative' : 'text-[#1d5c46]'}`}>{melding.tekst}</p>
      )}
    </div>
  );
}
