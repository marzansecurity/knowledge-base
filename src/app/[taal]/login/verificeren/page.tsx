'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useVertalingen } from '@/components/vertaling-provider';
import { pad } from '@/lib/paden';

function VerificatieFormulier() {
  const { taal, berichten: t } = useVertalingen();
  const router = useRouter();
  const zoekParams = useSearchParams();
  // Taalloos bewaard door de proxy; de taalprefix zetten we er zelf weer voor.
  const volgende = zoekParams.get('volgende') ?? '/';

  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [laden, setLaden] = useState(true);

  const geenMethode = t.login.verificeren.geenMethode;

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error || !data.totp[0]) {
        setFout(geenMethode);
        setLaden(false);
        return;
      }
      setFactorId(data.totp[0].id);
      setLaden(false);
    })();
  }, [geenMethode]);

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setFout(null);
    setBezig(true);

    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });

    if (error) {
      setFout(t.login.verificeren.codeOnjuist);
      setBezig(false);
      return;
    }

    router.replace(pad(taal, volgende));
    router.refresh();
  }

  return (
    <form onSubmit={verstuur} className="kb-card w-full max-w-sm p-7">
      <h1 className="text-[17px] font-bold text-navy">{t.login.verificeren.titel}</h1>
      <p className="mt-0.5 text-[11px] text-muted">{t.login.verificeren.uitleg}</p>

      <div className="mt-6">
        <label htmlFor="code" className="kb-label mb-1.5 block">
          {t.login.verificeren.code}
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
        {bezig ? t.login.verificeren.bezig : t.login.verificeren.bevestigen}
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
