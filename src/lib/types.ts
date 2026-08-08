import type { Taal } from '@/lib/talen';

// De weergavenamen van deze types staan in src/berichten/*.json onder "labels".
// Servercomponenten halen ze op met haalVertalingen(taal), clientcomponenten
// met useVertalingen(). Zo blijft er één plek per taal in plaats van losse
// labelmaps door de code heen.

export type ArticleStatus = 'draft' | 'published' | 'outdated' | 'archived';
export type ArticleSource = 'handmatig' | 'zoho-import';
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

export type Supplier = {
  id: string;
  name: string;
  countries: Country[];
  types: SupplierType[];
  carrier: string | null;
  tracking_available: boolean;
  tracking_automatic: boolean;
  notes: string | null;
  reviewed_at: string | null;
  updated_at: string;
};
