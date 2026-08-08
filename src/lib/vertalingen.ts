import nl from '@/berichten/nl.json';
import type { Taal } from '@/lib/talen';

/**
 * nl.json is het bronbestand: zijn vorm bepaalt het type. Ontbreekt er een
 * sleutel in en.json of fr.json, dan is dat een compileerfout — precies wat we
 * willen. Extra sleutels in een vertaling worden stilzwijgend genegeerd.
 */
export type Berichten = typeof nl;

/**
 * Een Record over alle talen, zodat het toevoegen van een taal aan TALEN
 * zonder bijbehorend woordenboek meteen door TypeScript wordt afgestraft.
 */
const woordenboeken: Record<Taal, () => Promise<Berichten>> = {
  nl: async () => nl,
  en: () => import('@/berichten/en.json').then((m) => m.default),
  fr: () => import('@/berichten/fr.json').then((m) => m.default),
};

/** Laadt de berichten voor een taal. Gebruik dit in servercomponenten. */
export function haalVertalingen(taal: Taal): Promise<Berichten> {
  return woordenboeken[taal]();
}
