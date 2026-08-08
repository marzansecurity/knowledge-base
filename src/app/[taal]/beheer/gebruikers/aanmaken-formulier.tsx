'use client';

import { useRef, useState, useTransition } from 'react';
import { useVertalingen } from '@/components/vertaling-provider';
import { USER_ROLES } from '@/lib/types';
import { maakGebruikerAan } from './acties';

function genereerWachtwoord() {
  const tekens = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 12 }, () => tekens[Math.floor(Math.random() * tekens.length)]).join('');
}

export function AanmakenFormulier() {
  const formRef = useRef<HTMLFormElement>(null);
  const wachtwoordRef = useRef<HTMLInputElement>(null);
  const [bezig, startTransitie] = useTransition();
  const [melding, setMelding] = useState<{ tekst: string; fout: boolean } | null>(null);
  const { berichten: t } = useVertalingen();

  function verstuur(formData: FormData) {
    setMelding(null);
    startTransitie(async () => {
      const resultaat = await maakGebruikerAan(formData);
      if (resultaat.fout) {
        setMelding({ tekst: resultaat.fout, fout: true });
      } else {
        setMelding({ tekst: resultaat.succes ?? t.beheer.gebruikers.accountAangemaakt, fout: false });
        formRef.current?.reset();
      }
    });
  }

  return (
    <div className="kb-card p-5">
      <div className="kb-section-title mb-3">{t.beheer.gebruikers.nieuwAccount}</div>
      <form ref={formRef} action={verstuur} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <label htmlFor="display_name" className="kb-label mb-1.5 block">
            {t.beheer.gebruikers.naam}
          </label>
          <input
            id="display_name"
            name="display_name"
            required
            className="kb-input"
            placeholder={t.beheer.gebruikers.naamPlaceholder}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <label htmlFor="email" className="kb-label mb-1.5 block">
            {t.beheer.gebruikers.email}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="kb-input"
            placeholder={t.beheer.gebruikers.emailPlaceholder}
          />
        </div>
        <div className="min-w-[150px]">
          <label htmlFor="role" className="kb-label mb-1.5 block">
            {t.beheer.gebruikers.rol}
          </label>
          <select id="role" name="role" defaultValue="reader" className="kb-input">
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {t.labels.rol[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label htmlFor="password" className="kb-label mb-1.5 block">
            {t.beheer.gebruikers.wachtwoord}
          </label>
          <div className="flex gap-1.5">
            <input
              ref={wachtwoordRef}
              id="password"
              name="password"
              type="text"
              required
              minLength={8}
              className="kb-input"
              placeholder={t.beheer.gebruikers.wachtwoordPlaceholder}
            />
            <button
              type="button"
              onClick={() => {
                if (wachtwoordRef.current) wachtwoordRef.current.value = genereerWachtwoord();
              }}
              className="kb-btn whitespace-nowrap"
            >
              {t.beheer.gebruikers.genereer}
            </button>
          </div>
        </div>
        <button type="submit" disabled={bezig} className="kb-btn kb-btn-primary whitespace-nowrap">
          {bezig ? t.algemeen.bezig : t.beheer.gebruikers.accountAanmaken}
        </button>
      </form>

      <p className="mt-2.5 text-[12px] text-muted">{t.beheer.gebruikers.wachtwoordToelichting}</p>

      {melding && (
        <p className={`mt-2 text-[13px] ${melding.fout ? 'text-negative' : 'text-[#1d5c46]'}`}>{melding.tekst}</p>
      )}
    </div>
  );
}
