'use client';

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { wisselTaalInPad } from '@/lib/paden';
import { TAAL_COOKIE, TAAL_COOKIE_MAXAGE, TAAL_NAAM, TALEN, type Taal } from '@/lib/talen';
import { useVertalingen } from '@/components/vertaling-provider';

/**
 * Taalkiezer die op de huidige pagina blijft: het pad houdt zijn vorm, alleen
 * het taalsegment verandert. De querystring gaat mee, zodat filters en
 * zoektermen niet wegvallen bij het wisselen.
 */

/** Twee tinten: de donkere zijbalk en de lichte loginpagina. */
type Tint = 'donker' | 'licht';

const STIJL: Record<Tint, { rust: string; actief: string }> = {
  donker: {
    rust: 'text-white/50 hover:bg-white/10 hover:text-white',
    actief: 'bg-white/10 text-white',
  },
  licht: {
    rust: 'text-muted hover:bg-page hover:text-navy',
    actief: 'bg-page text-navy',
  },
};

/**
 * Onthoudt de keuze voor een volgend bezoek: src/proxy.ts leest deze cookie als
 * er geen taal in de URL staat. Staat bewust buiten de component, want de
 * React-compiler staat het schrijven naar globals binnenin niet toe.
 */
function bewaarTaalkeuze(taal: Taal) {
  document.cookie = `${TAAL_COOKIE}=${taal};path=/;max-age=${TAAL_COOKIE_MAXAGE};samesite=lax`;
}

function Taalknoppen({ tint }: { tint: Tint }) {
  const { taal, berichten: t } = useVertalingen();
  const router = useRouter();
  const padnaam = usePathname();
  const zoekParams = useSearchParams();

  function wissel(nieuw: Taal) {
    if (nieuw === taal) return;

    bewaarTaalkeuze(nieuw);

    const query = zoekParams.toString();
    router.replace(`${wisselTaalInPad(padnaam, nieuw)}${query ? `?${query}` : ''}`);
    router.refresh();
  }

  return (
    <div role="group" aria-label={t.navigatie.taalKiezen} className="flex flex-wrap gap-1">
      {TALEN.map((code) => {
        const isHuidig = code === taal;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            onClick={() => wissel(code)}
            aria-current={isHuidig ? 'true' : undefined}
            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              isHuidig ? STIJL[tint].actief : STIJL[tint].rust
            }`}
          >
            {TAAL_NAAM[code]}
          </button>
        );
      })}
    </div>
  );
}

export function Taalwissel({ tint = 'donker', className }: { tint?: Tint; className?: string }) {
  // useSearchParams vraagt om een Suspense-grens; die zit hier, zodat elke
  // aanroeper hem gratis meekrijgt.
  return (
    <div className={className}>
      <Suspense fallback={null}>
        <Taalknoppen tint={tint} />
      </Suspense>
    </div>
  );
}
