'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TaalLink } from '@/components/taal-link';
import { useVertalingen } from '@/components/vertaling-provider';
import { pad } from '@/lib/paden';

/**
 * Landingspagina van de herstellink uit de e-mail. De link wordt bewust pas
 * ingewisseld als de gebruiker op de knop klikt: mailscanners (zoals Safe Links)
 * openen links vooraf, en een eenmalige link zou dan al verbruikt zijn voordat
 * de gebruiker hem zelf opent.
 */
function HerstelBevestigen() {
  const { taal, berichten: t } = useVertalingen();
  const router = useRouter();
  const zoekParams = useSearchParams();

  const tokenHash = zoekParams.get('token_hash');
  const type = zoekParams.get('type');
  const code = zoekParams.get('code');
  const heeftLink = Boolean((tokenHash && type === 'recovery') || code);

  const [bezig, setBezig] = useState(false);
  const [verlopen, setVerlopen] = useState(false);

  async function doorgaan() {
    setVerlopen(false);
    setBezig(true);

    const supabase = createClient();
    let gelukt = false;

    if (tokenHash && type === 'recovery') {
      const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
      gelukt = !error;
    } else if (code) {
      // Link uit het standaard-e-mailtemplate: de browserclient wisselt een ?code=
      // bij het opstarten zelf in. Kijk dus eerst of dat al een sessie heeft opgeleverd.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        gelukt = true;
      } else {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        gelukt = !error;
      }
    }

    if (!gelukt) {
      setVerlopen(true);
      setBezig(false);
      return;
    }

    // De proxy stuurt gebruikers met 2FA vanaf hier eerst langs de verificatiecode.
    router.replace(pad(taal, '/wachtwoord-resetten'));
    router.refresh();
  }

  return (
    <div className="kb-card w-full max-w-sm p-7">
      <Image src="/marzan-logo.svg" alt="Marzan Security" width={132} height={52} className="mb-4 h-11 w-auto" priority />
      <h1 className="text-[17px] font-bold text-navy">{t.login.herstellen.titel}</h1>

      {heeftLink ? (
        <>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{t.login.herstellen.uitleg}</p>

          {verlopen && (
            <p className="mt-4 rounded-md border border-[#f5c6c2] bg-[#fdf0ef] px-3 py-2 text-[12px] text-negative">
              {t.login.herstellen.verlopen}
            </p>
          )}

          {!verlopen && (
            <button type="button" onClick={doorgaan} disabled={bezig} className="kb-btn kb-btn-primary mt-6 w-full py-2">
              {bezig ? t.login.herstellen.bezig : t.login.herstellen.doorgaan}
            </button>
          )}
        </>
      ) : (
        <p className="mt-4 rounded-md border border-[#f5c6c2] bg-[#fdf0ef] px-3 py-2 text-[12px] text-negative">
          {t.login.herstellen.ongeldig}
        </p>
      )}

      {(verlopen || !heeftLink) && (
        <TaalLink href="/login/vergeten" className="kb-btn kb-btn-primary mt-6 block w-full py-2 text-center">
          {t.login.herstellen.nieuweLink}
        </TaalLink>
      )}
    </div>
  );
}

export default function HerstellenPagina() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12">
      <Suspense fallback={null}>
        <HerstelBevestigen />
      </Suspense>
    </main>
  );
}
