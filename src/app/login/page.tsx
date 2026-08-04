'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginFormulier() {
  const router = useRouter();
  const zoekParams = useSearchParams();
  const volgende = zoekParams.get('volgende') ?? '/';

  const [email, setEmail] = useState('');
  const [wachtwoord, setWachtwoord] = useState('');
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function verstuur(event: React.FormEvent) {
    event.preventDefault();
    setFout(null);
    setBezig(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: wachtwoord,
    });

    if (error) {
      setFout('Inloggen mislukt. Controleer je e-mailadres en wachtwoord.');
      setBezig(false);
      return;
    }

    router.replace(volgende);
    router.refresh();
  }

  return (
    <form onSubmit={verstuur} className="kb-card w-full max-w-sm p-7">
      <Image src="/marzan-logo.svg" alt="Marzan Security" width={132} height={52} className="mb-4 h-11 w-auto" priority />
      <h1 className="text-[17px] font-bold text-navy">Marzan Kennisbank</h1>
      <p className="mt-0.5 text-[11px] text-muted">Interne kennisbank · inloggen</p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="kb-label mb-1.5 block">
            E-mailadres
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="kb-input"
            placeholder="naam@marzansecurity.com"
          />
        </div>

        <div>
          <label htmlFor="wachtwoord" className="kb-label mb-1.5 block">
            Wachtwoord
          </label>
          <input
            id="wachtwoord"
            type="password"
            autoComplete="current-password"
            required
            value={wachtwoord}
            onChange={(e) => setWachtwoord(e.target.value)}
            className="kb-input"
          />
        </div>
      </div>

      {fout && (
        <p className="mt-4 rounded-md border border-[#f5c6c2] bg-[#fdf0ef] px-3 py-2 text-[12px] text-negative">
          {fout}
        </p>
      )}

      <button type="submit" disabled={bezig} className="kb-btn kb-btn-primary mt-6 w-full py-2">
        {bezig ? 'Bezig met inloggen…' : 'Inloggen'}
      </button>

      <p className="mt-5 text-[11px] leading-relaxed text-muted">
        Geen account? Vraag Martijn om je toe te voegen.
      </p>
    </form>
  );
}

export default function LoginPagina() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={null}>
        <LoginFormulier />
      </Suspense>
    </main>
  );
}
