import { TaalLink } from '@/components/taal-link';
import { STANDAARD_TAAL, TAAL_NAAM, TALEN, type Taal } from '@/lib/talen';
import type { ArticleTranslation } from '@/lib/types';

type Props = {
  /** Pad zonder taalprefix en zonder querystring, bv. '/beheer/artikelen/kluis-openen'. */
  basisPad: string;
  /** Welke taalversie nu bewerkt wordt. */
  actief: Taal;
  vertalingen: ArticleTranslation[];
  labels: {
    bron: string;
    nogNietVertaald: string;
    concept: string;
    verouderd: string;
  };
};

/**
 * Tabstrip om tussen de taalversies van een artikel te wisselen. Bewust via de
 * querystring in plaats van clientstate: zo is een taalversie deelbaar met een
 * link en blijft de editor een servercomponent-invoer.
 */
export function VertaalStrip({ basisPad, actief, vertalingen, labels }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TALEN.map((t) => {
        const vertaling = vertalingen.find((v) => v.locale === t);
        const isBron = t === STANDAARD_TAAL;
        const isActief = t === actief;

        // Het Nederlands is de bron en heeft dus geen vertaalstatus.
        const status = isBron
          ? labels.bron
          : !vertaling
            ? labels.nogNietVertaald
            : vertaling.stale
              ? labels.verouderd
              : vertaling.review_state === 'concept'
                ? labels.concept
                : null;

        return (
          <TaalLink
            key={t}
            href={isBron ? basisPad : `${basisPad}?vertaling=${t}`}
            className={`rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors ${
              isActief
                ? 'border-navy bg-navy text-white'
                : 'border-line text-ink-soft hover:border-navy-mid hover:text-navy'
            }`}
          >
            {TAAL_NAAM[t]}
            {status && (
              <span className={`ml-2 text-[11px] ${isActief ? 'text-white/70' : 'text-muted'}`}>
                {status}
              </span>
            )}
          </TaalLink>
        );
      })}
    </div>
  );
}
