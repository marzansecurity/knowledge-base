import { isTaal, STANDAARD_TAAL, type Taal } from '@/lib/talen';

/**
 * Bouwt een intern pad mét taalprefix.
 *
 *   pad('en')                    -> '/en'
 *   pad('en', '/bibliotheek')    -> '/en/bibliotheek'
 *   pad('fr', '/bibliotheek/', s) -> '/fr/bibliotheek/kluis-openen'
 *
 * Voor clientcomponenten is er TaalLink, die de taal zelf uit de context haalt.
 */
export function pad(taal: Taal, ...delen: string[]): string {
  const rest = delen
    .join('/')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/|\/$/g, '');
  return rest ? `/${taal}/${rest}` : `/${taal}`;
}

/** Haalt de taal uit een pad als '/en/bibliotheek', of null als die er niet in zit. */
export function taalUitPad(padnaam: string): Taal | null {
  const eerste = padnaam.split('/')[1];
  return isTaal(eerste) ? eerste : null;
}

/** Strip de taalprefix: '/en/bibliotheek' -> '/bibliotheek'. */
export function zonderTaal(padnaam: string): string {
  const taal = taalUitPad(padnaam);
  if (!taal) return padnaam;
  return padnaam.slice(`/${taal}`.length) || '/';
}

/** Vervangt de taal in een bestaand pad: ('/en/bibliotheek', 'fr') -> '/fr/bibliotheek'. */
export function wisselTaalInPad(padnaam: string, nieuweTaal: Taal): string {
  const rest = zonderTaal(padnaam);
  return pad(nieuweTaal, rest);
}

/**
 * Kiest een taal op basis van de Accept-Language-header.
 * Valt terug op het Nederlands als er niets bruikbaars in staat.
 */
export function taalUitHeader(header: string | null): Taal {
  if (!header) return STANDAARD_TAAL;

  const voorkeuren = header
    .split(',')
    .map((deel) => {
      const [tag, ...params] = deel.trim().split(';');
      const gewicht = params.find((p) => p.trim().startsWith('q='));
      const q = gewicht ? Number.parseFloat(gewicht.trim().slice(2)) : 1;
      return { basis: tag.split('-')[0].toLowerCase(), q: Number.isNaN(q) ? 0 : q };
    })
    .sort((a, b) => b.q - a.q);

  return voorkeuren.find((v) => isTaal(v.basis))?.basis as Taal ?? STANDAARD_TAAL;
}
