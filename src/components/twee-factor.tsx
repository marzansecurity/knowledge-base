'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useVertalingen } from '@/components/vertaling-provider';

type Factor = { id: string; status: string; friendly_name?: string | null };

export function TweeFactor() {
  const { berichten: t } = useVertalingen();
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
    setMelding({ tekst: t.login.tweeFactor.ingeschakeld, fout: false });
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
    setMelding({ tekst: t.login.tweeFactor.uitgeschakeld, fout: false });
    laadFactoren();
  }

  const actieveFactor = factoren?.find((f) => f.status === 'verified');

  return (
    <div className="kb-card p-5">
      <div className="kb-section-title mb-3">{t.login.tweeFactor.titel}</div>

      {factoren === null && <p className="text-[13px] text-muted">{t.login.tweeFactor.laden}</p>}

      {factoren !== null && !inschrijving && (
        <>
          {actieveFactor ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-[#1d5c46]">{t.login.tweeFactor.actief}</p>
              <button
                type="button"
                onClick={() => schakelUit(actieveFactor.id)}
                disabled={bezig}
                className="kb-btn whitespace-nowrap"
              >
                {t.login.tweeFactor.uitschakelen}
              </button>
            </div>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-muted">{t.login.tweeFactor.nietIngesteld}</p>
              <button type="button" onClick={startInschrijving} disabled={bezig} className="kb-btn kb-btn-primary mt-3">
                {t.login.tweeFactor.instellen}
              </button>
            </>
          )}
        </>
      )}

      {inschrijving && (
        <div>
          <p className="text-[13px] leading-relaxed text-muted">{t.login.tweeFactor.qrUitleg}</p>
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
                {t.login.tweeFactor.codeLabel}
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
              {t.login.tweeFactor.bevestigen}
            </button>
            <button
              type="button"
              onClick={() => {
                setInschrijving(null);
                setCode('');
              }}
              className="kb-btn whitespace-nowrap"
            >
              {t.algemeen.annuleren}
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
