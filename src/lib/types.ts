import type { Taal } from '@/lib/talen';

// De weergavenamen van deze types staan in src/berichten/*.json onder "labels".
// Servercomponenten halen ze op met haalVertalingen(taal), clientcomponenten
// met useVertalingen(). Zo blijft er één plek per taal in plaats van losse
// labelmaps door de code heen.

export type ArticleStatus = 'draft' | 'published' | 'outdated' | 'archived';
export type ArticleSource = 'handmatig' | 'zoho-import';

/** Het type bepaalt het sjabloon van een artikel — zie AGENTS.md. */
export type ArticleType = 'gespreksroute' | 'procedure' | 'naslag' | 'producttraining';
export const ARTICLE_TYPES: ArticleType[] = ['gespreksroute', 'procedure', 'naslag', 'producttraining'];

export type ArticleChannel = 'klantcontact' | 'backoffice' | 'technisch' | 'alle';
export const ARTICLE_CHANNELS: ArticleChannel[] = ['klantcontact', 'backoffice', 'technisch', 'alle'];
export type UserRole = 'reader' | 'editor' | 'admin';
export const USER_ROLES: UserRole[] = ['reader', 'editor', 'admin'];

export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  active: boolean;
};

export type Tag = {
  id: string;
  /** De taalneutrale sleutel; hierop wordt gefilterd, ook in filter-URL's. */
  name: string;
  /** De weergavenaam in de huidige taal; valt terug op `name`. */
  label: string;
};

export type ArticleSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: ArticleStatus;
  category_id: string | null;
  reviewed_at: string | null;
  updated_at: string;
  /** De taal waarin dit artikel getoond wordt. */
  vertaling_taal: Taal;
  /** True als er geen vertaling was en dit de Nederlandse versie is. */
  is_terugval: boolean;
  // Leerpadvelden: alleen gevuld op de lijstquery-route; zoekresultaten via
  // zoek_artikelen() geven ze niet mee.
  path_order?: number | null;
  required_reading?: boolean;
};

/** Eén taalversie van een artikel, zoals opgeslagen in article_translations. */
export type ArticleTranslation = {
  article_id: string;
  locale: Taal;
  slug: string;
  title: string;
  summary: string | null;
  content_markdown: string;
  review_state: 'concept' | 'nagekeken';
  stale: boolean;
  updated_at: string;
};

export type ArticleDetail = ArticleSummary & {
  content_markdown: string;
  type: ArticleType;
  /** Leeg = geldt overal. Zelfde waarden als suppliers.countries. */
  countries: Country[];
  channel: ArticleChannel;
  /** Plek in het onboarding-leerpad; null = staat niet in het pad. */
  path_order: number | null;
  required_reading: boolean;
  source: ArticleSource;
  source_article_id: string | null;
  owner_id: string | null;
  published_at: string | null;
  review_due_at: string | null;
  created_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type ArticleRevision = {
  id: string;
  article_id: string;
  title: string;
  content_markdown: string;
  saved_at: string;
  saved_by: string | null;
  change_note: string | null;
};

export const ARTICLE_STATUSES: ArticleStatus[] = ['draft', 'published', 'outdated', 'archived'];

export type Country = 'NL' | 'BE' | 'UK';
export const COUNTRIES: Country[] = ['NL', 'BE', 'UK'];

export type SupplierType = 'fulfilment' | 'dropshipment' | 'installateur';
export const SUPPLIER_TYPES: SupplierType[] = ['fulfilment', 'dropshipment', 'installateur'];

/** Hoe een onderdeel van het orderproces bij een leverancier loopt. */
export type AutomationStatus = 'auto' | 'half' | 'manual' | 'nvt';
export const AUTOMATION_STATUSES: AutomationStatus[] = ['auto', 'half', 'manual', 'nvt'];

/** De vier onderdelen van het orderproces die een status hebben. */
export type SupplierStep = 'stock_sync' | 'purchase_order' | 'order_confirmation' | 'tracking';
export const SUPPLIER_STEPS: SupplierStep[] = ['stock_sync', 'purchase_order', 'order_confirmation', 'tracking'];

/**
 * De kolommen van het leveranciersoverzicht, in de volgorde waarin een order
 * loopt. De vervoerder staat direct vóór de tracking: die horen bij elkaar.
 */
export type SupplierColumn = SupplierStep | 'carrier';
export const SUPPLIER_COLUMNS: SupplierColumn[] = [
  'stock_sync',
  'purchase_order',
  'order_confirmation',
  'carrier',
  'tracking',
];

/** Nederland en België werken hetzelfde en vormen één regio; de UK werkt anders. */
export type Region = 'nlbe' | 'uk';
export const REGIONS: Region[] = ['nlbe', 'uk'];

/** Hoe een leverancier in één regio werkt. */
export type SupplierRegion = {
  id: string;
  supplier_id: string;
  region: Region;
  types: SupplierType[];
  /** Null = nog niet ingevuld. */
  stock_sync_status: AutomationStatus | null;
  stock_sync_frequency: string | null;
  purchase_order_status: AutomationStatus | null;
  order_confirmation_status: AutomationStatus | null;
  carrier: string | null;
  tracking_status: AutomationStatus | null;
  /** Korte toelichting, zichtbaar in het overzicht. */
  notes: string | null;
  updated_at: string;
};

export type Supplier = {
  id: string;
  slug: string;
  name: string;
  /** ISO-landcode van waaruit de leverancier opereert, bv. DE. */
  based_in: string | null;
  /** Onze eigen voorraad (PON): bovenaan en in een eigen kleur. */
  own_stock: boolean;
  /** Hier bestellen we containers (bulk, via Phoenix): apart blok onderaan. */
  container_purchase: boolean;
  /** Uitgebreide uitleg op de detailpagina. */
  details_markdown: string | null;
  related_article_slugs: string[];
  reviewed_at: string | null;
  updated_at: string;
  /** Alleen de regio's waarin de leverancier actief is. */
  regions: SupplierRegion[];
};