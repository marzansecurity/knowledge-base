import type { Taal } from '@/lib/talen';
import type { AutomationStatus, Region, Supplier, SupplierColumn, SupplierRegion, SupplierStep } from '@/lib/types';

/**
 * Het artikel dat uitlegt wat de kolommen van het leveranciersoverzicht
 * betekenen. De slug volgt de Nederlandse titel (zie importeer-gespreksroutes.mjs);
 * wordt die titel gewijzigd, dan moet deze slug mee.
 */
export const UITLEG_ARTIKEL = 'toeleveranciers-wat-gaat-automatisch-en-waar-grijp-je-zelf-in';

/**
 * Per kolom: welke kop uit het uitlegartikel in het uitlegvenster komt, en naar
 * welk artikel "lees het hele artikel" gaat. Het anker is de kop in de
 * Nederlandse tekst.
 */
export const UITLEG_PER_KOLOM: Record<SupplierColumn, { anker: string; artikel: string }> = {
  stock_sync: { anker: 'voorraad-sync', artikel: 'voorraadsynchronisatie-en-levertijdlogica' },
  purchase_order: { anker: 'inkooporder', artikel: UITLEG_ARTIKEL },
  order_confirmation: { anker: 'orderbevestiging', artikel: UITLEG_ARTIKEL },
  carrier: { anker: 'leverancier-of-vervoerder-haal-dat-niet-door-elkaar', artikel: UITLEG_ARTIKEL },
  tracking: { anker: 'tracking', artikel: UITLEG_ARTIKEL },
};

/** Landen waaruit een leverancier kan opereren; de namen komen uit Intl, in de taal van de lezer. */
export const VANUIT_LANDEN = ['NL', 'BE', 'DE', 'GB', 'FR', 'IT', 'AT', 'CH', 'DK', 'SE', 'PL', 'CZ', 'ES', 'CN'];

export function landNaam(code: string, taal: Taal) {
  try {
    return new Intl.DisplayNames([taal], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function statusVan(regio: SupplierRegion, stap: SupplierStep): AutomationStatus | null {
  return regio[`${stap}_status`];
}

export function regioVan(s: Supplier, regio: Region): SupplierRegion | undefined {
  return s.regions.find((r) => r.region === regio);
}

/** Zelfde slug-regels als maakSlug() in beheer/artikelen/acties.ts. */
export function maakLeverancierSlug(naam: string) {
  return (
    naam
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'leverancier'
  );
}

/**
 * Leest de gekoppelde artikelen uit het tekstvak: één per regel, als slug of
 * als geplakte link uit de adresbalk (…/bibliotheek/<slug>). Dubbele eruit.
 */
export function leesArtikelSlugs(tekst: string): string[] {
  const slugs = tekst
    .split(/\r?\n/)
    .map((regel) => regel.trim())
    .filter(Boolean)
    .map((regel) => {
      const zonderQuery = regel.split(/[?#]/)[0].replace(/\/+$/, '');
      return zonderQuery.slice(zonderQuery.lastIndexOf('/') + 1).toLowerCase();
    })
    .filter((slug) => /^[a-z0-9-]+$/.test(slug));
  return [...new Set(slugs)];
}

const STATUS_TEKST: Record<AutomationStatus, string> = {
  auto: 'auto',
  half: 'half (automatisch, maar nog niet betrouwbaar of deels handwerk)',
  manual: 'manual (zelf doen)',
  nvt: 'n.v.t.',
};

const REGIO_TEKST: Record<Region, string> = { nlbe: 'NL/BE', uk: 'UK' };

/**
 * Het overzicht als platte tabel voor de AI-assistent: één regel per
 * leverancier per regio, want de werkwijze verschilt per regio.
 */
export function leveranciersVoorAssistent(leveranciers: Supplier[]): string {
  const cel = (status: AutomationStatus | null) => (status ? STATUS_TEKST[status] : 'nog niet ingevuld');
  const schoon = (tekst: string | null) => (tekst ?? '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '/');

  const regels = [
    '| Leverancier | Regio | Vanuit | Type | Voorraad-sync | Inkooporder | Orderbevestiging (leverweek) | Vervoerder | Tracking | Toelichting |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const s of leveranciers) {
    for (const r of s.regions) {
      const cellen = [
        s.name + (s.own_stock ? ' (eigen voorraad)' : ''),
        REGIO_TEKST[r.region],
        s.based_in ?? '—',
        r.types.length ? r.types.map((t) => (t === 'fulfilment' ? 'E-fulfilment' : t)).join('/') : '—',
        cel(r.stock_sync_status) + (r.stock_sync_frequency ? ` (${schoon(r.stock_sync_frequency)})` : ''),
        cel(r.purchase_order_status),
        cel(r.order_confirmation_status),
        schoon(r.carrier) || '—',
        cel(r.tracking_status),
        schoon(r.notes) || '—',
      ];
      regels.push(`| ${cellen.join(' | ')} |`);
    }
  }

  const uitleg = leveranciers
    .filter((s) => s.details_markdown)
    .map((s) => `#### ${s.name}\n${s.details_markdown}`);

  return [regels.join('\n'), ...(uitleg.length ? ['Uitleg per leverancier:', ...uitleg] : [])].join('\n\n');
}
