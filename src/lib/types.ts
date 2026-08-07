export type ArticleStatus = 'draft' | 'published' | 'outdated' | 'archived';
export type ArticleSource = 'handmatig' | 'zoho-import';
export type UserRole = 'reader' | 'editor' | 'admin';

export const ROLE_LABEL: Record<UserRole, string> = {
  reader: 'Medewerker',
  editor: 'Redacteur',
  admin: 'Beheerder',
};

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
  name: string;
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

export const STATUS_LABEL: Record<ArticleStatus, string> = {
  draft: 'Concept',
  published: 'Gepubliceerd',
  outdated: 'Verouderd',
  archived: 'Gearchiveerd',
};
