import type { AutomationStatus, Supplier, SupplierStep } from '@/lib/types';

/**
 * Het artikel dat uitlegt wat de kolommen van het leveranciersoverzicht
 * betekenen. De slug volgt de Nederlandse titel (zie importeer-gespreksroutes.mjs);
 * wordt die titel gewijzigd, dan moet deze slug mee.
 */
export const UITLEG_ARTIKEL = 'toeleveranciers-wat-gaat-automatisch-en-waar-grijp-je-zelf-in';

/**
 * Waar een kolomkop naartoe linkt. Het anker is de kop in het Nederlandse
 * artikel; in een vertaling komt de lezer bovenaan het artikel uit.
 */
export const UITLEG_PER_KOLOM: Record<SupplierStep | 'carrier', { slug: string; anker?: string }> = {
  purchase_order: { slug: UITLEG_ARTIKEL, anker: 'inkooporder' },
  order_confirmation: { slug: UITLEG_ARTIKEL, anker: 'orderbevestiging' },
  tracking: { slug: UITLEG_ARTIKEL, anker: 'tracking' },
  stock_sync: { slug: 'voorraadsynchronisatie-en-levertijdlogica', anker: 'hoe-de-voorraadsynchronisatie-werkt' },
  carrier: { slug: UITLEG_ARTIKEL, anker: 'leverancier-of-vervoerder-haal-dat-niet-door-elkaar' },
};

export function statusVan(s: Supplier, stap: SupplierStep): AutomationStatus | null {
  return s[`${stap}_status`];
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

/**
 * Het overzicht als platte tabel voor de AI-assistent. Deze gegevens stonden
 * eerder als tabel in het uitlegartikel; zonder dit blok zou de assistent ze
 * kwijt zijn.
 */
export function leveranciersVoorAssistent(leveranciers: Supplier[]): string {
  const cel = (status: AutomationStatus | null) => (status ? STATUS_TEKST[status] : 'nog niet ingevuld');
  const schoon = (tekst: string | null) => (tekst ?? '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '/');

  const regels = [
    '| Leverancier | Landen | Type | Inkooporder | Orderbevestiging (leverweek) | Tracking | Voorraad-sync | Vervoerder | Toelichting |',
    '|---|---|---|---|---|---|---|---|---|',
    ...leveranciers.map((s) =>
      [
        s.name,
        s.countries.length ? s.countries.join('/') : '—',
        s.types.length ? s.types.join('/') : '—',
        cel(s.purchase_order_status),
        cel(s.order_confirmation_status),
        cel(s.tracking_status),
        cel(s.stock_sync_status) + (s.stock_sync_frequency ? ` (${schoon(s.stock_sync_frequency)})` : ''),
        schoon(s.carrier) || '—',
        [schoon(s.notes), schoon(s.details_markdown)].filter(Boolean).join(' — ') || '—',
      ].join(' | '),
    ).map((r) => `| ${r} |`),
  ];
  return regels.join('\n');
}
