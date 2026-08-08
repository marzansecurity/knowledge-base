'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function VerificatieFormulier() {
  const router = useRouter();
  const zoekParams = useSearchParams();
  const volgende = zoekParams.get('volgende') ?? '/';

  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error || !data.totp[0]) {
        setFout('Geen twee-factor-methode gevonden. Log opnieuw in.');
        setLaden(false);
        return;
      }
      setFactorId(data.totp[0].id);
      setLaden(false);
    })();
  }, []);

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setFout(null);
    setBezig(true);

    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });

    if (error) {
      setFout('Code onjuist of verlopen. Probeer het opnieuw.');
      setBezig(false);
      return;
    }

    router.replace(volgende);
    router.refresh();
  }

  return (
    <form onSubmit={verstuur} className="kb-card w-full max-w-sm p-5">
      <h1 className="text-[17px] font-bold text-navy">Verificatiecode</h1>
      <p className="mt-0.5 text-[11px] text-muted">Vul de 6-cijferige code uit je authenticator-app in.</p>

      <div className="mt-6">
        <label htmlFor="code" className="kb-label mb-1.5 block">
          Code
        </label>
        <input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          autoFocus
          disabled={laden}
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          className="kb-input"
          placeholder="123456"
        />
      </div>

      {fout && (
        <p className="mt-4 rounded-md border border-[#f5c6c2] bg-[#fdf0ef] px-3 py-2 text-[12px] text-negative">
          {fout}
        </p>
      )}

      <button type="submit" disabled={bezig || laden || !factorId} className="kb-btn kb-btn-primary mt-6 w-full py-2">
        {bezig ? 'Bezig met verifiëren…' : 'Bevestigen'}
      </button>
    </form>
  );
}

export default function VerificatiePagina() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={null}>
        <VerificatieFormulier />
      </Suspense>
    </main>
  );
}
