'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useVertalingen } from '@/components/vertaling-provider';
import { pad } from '@/lib/paden';
import { MINIMUM_WACHTWOORD_LENGTE } from '@/lib/wachtwoord';

/**
 * Hier komt de gebruiker na de herstellink. Het pad zit niet in de publieke
 * paden van de proxy: zonder sessie kom je hier niet, en heeft de gebruiker
 * 2FA, dan moet eerst de verificatiecode erlangs. Supabase eist die tweede
 * stap ook zelf voordat een wachtwoord van zo'n account gewijzigd mag worden.
 */
export default function WachtwoordResettenPagina() {
  const { taal, berichten: t } = useVertalingen();
  const router = useRouter();

  const [wachtwoord, setWachtwoord] = useState('');
  const [herhaal, setHerhaal] = useState('');
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function verstuur(event: React.FormEvent) {
    event.preventDefault();
    setFout(null);

    if (wachtwoord !== herhaal) {
      setFout(t.login.nieuwWachtwoord.nietGelijk);
      return;
    }

    setBezig(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: wachtwoord });

    if (error) {
      setFout(error.message);
      setBezig(false);
      return;
    }

    // Wie het wachtwoord kwijt was, weet niet wie er nog meer met het oude
    // ingelogd is. Alleen deze sessie blijft bestaan.
    await supabase.auth.signOut({ scope: 'others' });

    setKlaar(true);
    router.replace(pad(taal));
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12">
      <form onSubmit={verstuur} className="kb-card w-full max-w-sm p-7">
        <Image src="/marzan-logo.svg" alt="Marzan Security" width={132} height={52} className="mb-4 h-11 w-auto" priority />
        <h1 className="text-[17px] font-bold text-navy">{t.login.nieuwWachtwoord.titel}</h1>
        <p className="mt-0.5 text-[11px] text-muted">{t.login.nieuwWachtwoord.uitleg}</p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="nieuw-wachtwoord" className="kb-label mb-1.5 block">
              {t.login.nieuwWachtwoord.nieuw.replace('{aantal}', String(MINIMUM_WACHTWOORD_LENGTE))}
            </label>
            <input
              id="nieuw-wachtwoord"
              type="password"
              autoComplete="new-password"
              required
              autoFocus
              minLength={MINIMUM_WACHTWOORD_LENGTE}
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              className="kb-input"
            />
          </div>

          <div>
            <label htmlFor="herhaal-wachtwoord" className="kb-label mb-1.5 block">
              {t.login.nieuwWachtwoord.herhaal}
            </label>
            <input
              id="herhaal-wachtwoord"
              type="password"
              autoComplete="new-password"
              required
              minLength={MINIMUM_WACHTWOORD_LENGTE}
              value={herhaal}
              onChange={(e) => setHerhaal(e.target.value)}
              className="kb-input"
            />
          </div>
        </div>

        {fout && (
          <p className="mt-4 rounded-md border border-[#f5c6c2] bg-[#fdf0ef] px-3 py-2 text-[12px] text-negative">
            {fout}
          </p>
        )}

        {klaar && (
          <p className="mt-4 rounded-md border border-[#bfe0d1] bg-[#eef8f3] px-3 py-2 text-[12px] text-[#1d5c46]">
            {t.login.nieuwWachtwoord.klaar}
          </p>
        )}

        <button type="submit" disabled={bezig || klaar} className="kb-btn kb-btn-primary mt-6 w-full py-2">
          {bezig ? t.login.nieuwWachtwoord.bezig : t.login.nieuwWachtwoord.opslaan}
        </button>
      </form>
    </main>
  );
}
