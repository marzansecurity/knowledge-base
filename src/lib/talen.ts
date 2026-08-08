/**
 * De talen waarin de kennisbank beschikbaar is.
 *
 * Dit bestand wordt óók door src/proxy.ts geïmporteerd. Houd het daarom vrij van
 * `server-only`, van Node-specifieke imports en van React — de proxy bundelt het mee.
 *
 * Een taal toevoegen (bijvoorbeeld Duits): zet 'de' hieronder in TALEN, voeg
 * src/berichten/de.json toe en een regel in src/lib/vertalingen.ts. TypeScript
 * wijst die laatste plek zelf aan als je hem vergeet.
 */

export const TALEN = ['nl', 'en', 'fr'] as const;

export type Taal = (typeof TALEN)[number];

export const STANDAARD_TAAL: Taal = 'nl';

/** Naam van de cookie waarin de taalkeuze bewaard blijft. */
export const TAAL_COOKIE = 'taal';

/** Hoe lang de taalkeuze onthouden wordt: een jaar. */
export const TAAL_COOKIE_MAXAGE = 60 * 60 * 24 * 365;

export function isTaal(waarde: string | undefined | null): waarde is Taal {
  return typeof waarde === 'string' && (TALEN as readonly string[]).includes(waarde);
}

/** Hoe de taal zichzelf noemt — bewust niet vertaald, dat is de bedoeling. */
export const TAAL_NAAM: Record<Taal, string> = {
  nl: 'Nederlands',
  en: 'English',
  fr: 'Français',
};

/**
 * De BCP 47-tag voor datum- en getalopmaak. Bewust per markt gekozen: het
 * Engels is voor het Verenigd Koninkrijk en het Frans voor Franstalig België,
 * en die schrijven hun datums anders dan en-US respectievelijk fr-FR.
 */
export const TAAL_OPMAAK: Record<Taal, string> = {
  nl: 'nl-NL',
  en: 'en-GB',
  fr: 'fr-BE',
};
