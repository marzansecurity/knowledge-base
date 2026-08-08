'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function WachtwoordWijzigen() {
  const [wachtwoord, setWachtwoord] = useState('');
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ tekst: string; fout: boolean } | null>(null);

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    setMelding(null);
    setBezig(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: wachtwoord });

    setBezig(false);
    if (error) {
      setMelding({ tekst: error.message, fout: true });
      return;
    }
    setWachtwoord('');
    setMelding({ tekst: 'Wachtwoord bijgewerkt.', fout: false });
  }

  return (
    <div className="kb-card p-5">
      <div className="kb-section-title mb-3">Mijn wachtwoord wijzigen</div>
      <form onSubmit={verstuur} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="nieuw-wachtwoord" className="kb-label mb-1.5 block">
            Nieuw wachtwoord (min. 8 tekens)
          </label>
          <input
            id="nieuw-wachtwoord"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={wachtwoord}
            onChange={(e) => setWachtwoord(e.target.value)}
            className="kb-input"
          />
        </div>
        <button type="submit" disabled={bezig} className="kb-btn kb-btn-primary whitespace-nowrap">
          {bezig ? 'Bezig…' : 'Wachtwoord opslaan'}
        </button>
      </form>

      {melding && (
        <p className={`mt-2.5 text-[13px] ${melding.fout ? 'text-negative' : 'text-[#1d5c46]'}`}>{melding.tekst}</p>
      )}
    </div>
  );
}
