'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Factor = { id: string; status: string; friendly_name?: string | null };

export function TweeFactor() {
  const [factoren, setFactoren] = useState<Factor[] | null>(null);
  const [inschrijving, setInschrijving] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ tekst: string; fout: boolean } | null>(null);

  async function laadFactoren() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error) setFactoren(data.totp);
  }

  useEffect(() => {
    (async () => {
      await laadFactoren();
    })();
  }, []);

  async function startInschrijving() {
    setMelding(null);
    setBezig(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    setBezig(false);
    if (error) {
      setMelding({ tekst: error.message, fout: true });
      return;
    }
    setInschrijving({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function bevestigInschrijving(e: React.FormEvent) {
    e.preventDefault();
    if (!inschrijving) return;
    setMelding(null);
    setBezig(true);

    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: inschrijving.factorId,
      code,
    });

    setBezig(false);
    if (error) {
      setMelding({ tekst: error.message, fout: true });
      return;
    }
    setInschrijving(null);
    setCode('');
    setMelding({ tekst: 'Twee-factor-authenticatie is actief.', fout: false });
    laadFactoren();
  }

  async function schakelUit(factorId: string) {
    setMelding(null);
    setBezig(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBezig(false);
    if (error) {
      setMelding({ tekst: error.message, fout: true });
      return;
    }
    setMelding({ tekst: 'Twee-factor-authenticatie is uitgeschakeld.', fout: false });
    laadFactoren();
  }

  const actieveFactor = factoren?.find((f) => f.status === 'verified');

  return (
    <div className="kb-card p-3.5">
      <div className="kb-section-title mb-3">Twee-factor-authenticatie</div>

      {factoren === null && <p className="text-[13px] text-muted">Laden…</p>}

      {factoren !== null && !inschrijving && (
        <>
          {actieveFactor ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-[#1d5c46]">
                ✓ Actief. Bij het inloggen wordt na je wachtwoord een code uit je authenticator-app gevraagd.
              </p>
              <button
                type="button"
                onClick={() => schakelUit(actieveFactor.id)}
                disabled={bezig}
                className="kb-btn whitespace-nowrap"
              >
                Uitschakelen
              </button>
            </div>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-muted">
                Nog niet ingesteld. Met 2FA vraagt de kennisbank bij het inloggen een extra code uit een
                authenticator-app (bv. Google Authenticator of 1Password), naast je wachtwoord.
              </p>
              <button type="button" onClick={startInschrijving} disabled={bezig} className="kb-btn kb-btn-primary mt-3">
                2FA instellen
              </button>
            </>
          )}
        </>
      )}

      {inschrijving && (
        <div>
          <p className="text-[13px] leading-relaxed text-muted">
            Scan deze QR-code met je authenticator-app, of voer de code handmatig in.
          </p>
          <div
            className="my-3 h-[180px] w-[180px] [&_svg]:h-full [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: inschrijving.qr }}
          />
          <p className="mb-3 rounded-md bg-page px-3 py-2 font-mono text-[12px] break-all text-ink-soft">
            {inschrijving.secret}
          </p>
          <form onSubmit={bevestigInschrijving} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px]">
              <label htmlFor="totp-code" className="kb-label mb-1.5 block">
                6-cijferige code
              </label>
              <input
                id="totp-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                className="kb-input"
                placeholder="123456"
              />
            </div>
            <button type="submit" disabled={bezig} className="kb-btn kb-btn-primary whitespace-nowrap">
              Bevestigen
            </button>
            <button
              type="button"
              onClick={() => {
                setInschrijving(null);
                setCode('');
              }}
              className="kb-btn whitespace-nowrap"
            >
              Annuleren
            </button>
          </form>
        </div>
      )}

      {melding && (
        <p className={`mt-3 text-[13px] ${melding.fout ? 'text-negative' : 'text-[#1d5c46]'}`}>{melding.tekst}</p>
      )}
    </div>
  );
}
