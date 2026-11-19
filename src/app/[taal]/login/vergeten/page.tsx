'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Taalwissel } from '@/components/taalwissel';
import { TaalLink } from '@/components/taal-link';
import { useVertalingen } from '@/components/vertaling-provider';
import { pad } from '@/lib/paden';

function VergetenFormulier() {
  const { taal, berichten: t } = useVertalingen();

  const [email, setEmail] = useState('');
  const [bezig, setBezig] = useState(false);
  const [verstuurd, setVerstuurd] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function verstuur(event: React.FormEvent) {
    event.preventDefault();
    setFout(null);
    setBezig(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // Moet in Supabase onder Authentication → URL Configuration op de lijst
      // met toegestane redirect-URL's staan (zie supabase/wachtwoord-herstel.md).
      redirectTo: `${window.location.origin}${pad(taal, '/login/herstellen')}`,
    });

    setBezig(false);
    if (error) {
      // Supabase meldt een onbekend e-mailadres bewust niet als fout, zodat je
      // hier niet kunt achterhalen wie er een account heeft. Een fout betekent
      // dus: te vaak aangevraagd, of het versturen zelf is mislukt.
      setFout(error.status === 429 ? t.login.vergeten.teVaak : t.login.vergeten.mislukt);
      return;
    }
    setVerstuurd(true);
  }

  return (
    <form onSubmit={verstuur} className="kb-card w-full max-w-sm p-7">
      <Image src="/marzan-logo.svg" alt="Marzan Security" width={132} height={52} className="mb-4 h-11 w-auto" priority />
      <h1 className="text-[17px] font-bold text-navy">{t.login.vergeten.titel}</h1>

      {verstuurd ? (
        <p className="mt-4 rounded-md border border-[#bfe0d1] bg-[#eef8f3] px-3 py-2 text-[12px] leading-relaxed text-[#1d5c46]">
          {t.login.vergeten.verstuurd}
        </p>
      ) : (
        <>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{t.login.vergeten.uitleg}</p>

          <div className="mt-6">
            <label htmlFor="email" className="kb-label mb-1.5 block">
              {t.login.email}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="kb-input"
              placeholder="naam@marzansecurity.com"
            />
          </div>

          {fout && (
            <p className="mt-4 rounded-md border border-[#f5c6c2] bg-[#fdf0ef] px-3 py-2 text-[12px] text-negative">
              {fout}
            </p>
          )}

          <button type="submit" disabled={bezig} className="kb-btn kb-btn-primary mt-6 w-full py-2">
            {bezig ? t.login.vergeten.bezig : t.login.vergeten.versturen}
          </button>

          <p className="mt-5 text-[11px] leading-relaxed text-muted">{t.login.vergeten.tweeFactorTip}</p>
        </>
      )}

      <TaalLink href="/login" className="mt-5 inline-block text-[11px] text-muted underline hover:text-navy">
        {t.login.vergeten.terug}
      </TaalLink>
    </form>
  );
}

export default function VergetenPagina() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12">
      <VergetenFormulier />
      <Taalwissel tint="licht" />
    </main>
  );
}
