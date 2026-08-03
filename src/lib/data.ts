import type { SupabaseClient } from '@supabase/supabase-js';
import type { ArticleDetail, ArticleSummary, Category, Tag } from '@/lib/types';

/** Bouwt de categorieboom op basis van parent_id, in sort_order. */
export function bouwCategorieboom(categorieen: Category[]) {
  const perOuder = new Map<string | null, Category[]>();
  for (const c of categorieen) {
    const lijst = perOuder.get(c.parent_id) ?? [];
    lijst.push(c);
    perOuder.set(c.parent_id, lijst);
  }
  for (const lijst of perOuder.values()) lijst.sort((a, b) => a.sort_order - b.sort_order);

  type Knoop = Category & { kinderen: Knoop[] };
  const maak = (ouder: string | null): Knoop[] =>
    (perOuder.get(ouder) ?? []).map((c) => ({ ...c, kinderen: maak(c.id) }));

  return maak(null);
}

export async function haalCategorieen(supabase: SupabaseClient): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('active', true)
    .order('sort_order');
  if (error) throw error;
  return data as Category[];
}

export async function haalTags(supabase: SupabaseClient): Promise<Tag[]> {
  const { data, error } = await supabase.from('tags').select('*').order('name');
  if (error) throw error;
  return data as Tag[];
}

type ArtikelFilter = {
  categorySlug?: string;
  tagNamen?: string[];
  zoekterm?: string;
  statussen?: string[];
};

/**
 * Haalt artikelen op. Gebruikt de databasefunctie zoek_artikelen zodra er een
 * zoekterm is (Nederlandse volledige-tekst + tikfouttolerantie), anders een
 * gewone lijstquery.
 */
export async function haalArtikelen(
  supabase: SupabaseClient,
  filter: ArtikelFilter,
): Promise<ArticleSummary[]> {
  const statussen = filter.statussen ?? ['published'];

  if (filter.zoekterm?.trim()) {
    const { data, error } = await supabase.rpc('zoek_artikelen', { zoekterm: filter.zoekterm });
    if (error) throw error;
    let rijen = (data ?? []) as ArticleSummary[];
    rijen = rijen.filter((r) => statussen.includes(r.status));
    if (filter.categorySlug) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', filter.categorySlug)
        .single();
      if (cat) rijen = rijen.filter((r) => r.category_id === cat.id);
    }
    if (filter.tagNamen?.length) {
      const ids = await artikelIdsMetTags(supabase, filter.tagNamen);
      rijen = rijen.filter((r) => ids.has(r.id));
    }
    return rijen;
  }

  let query = supabase
    .from('articles')
    .select('id, slug, title, summary, status, category_id, reviewed_at, updated_at')
    .in('status', statussen)
    .order('title');

  if (filter.categorySlug) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', filter.categorySlug)
      .single();
    query = query.eq('category_id', cat?.id ?? '00000000-0000-0000-0000-000000000000');
  }

  const { data, error } = await query;
  if (error) throw error;
  let rijen = (data ?? []) as ArticleSummary[];

  if (filter.tagNamen?.length) {
    const ids = await artikelIdsMetTags(supabase, filter.tagNamen);
    rijen = rijen.filter((r) => ids.has(r.id));
  }

  return rijen;
}

async function artikelIdsMetTags(supabase: SupabaseClient, tagNamen: string[]) {
  const { data } = await supabase
    .from('article_tags')
    .select('article_id, tags!inner(name)')
    .in('tags.name', tagNamen);
  return new Set((data ?? []).map((r) => r.article_id as string));
}

export async function haalArtikel(
  supabase: SupabaseClient,
  slug: string,
): Promise<ArticleDetail | null> {
  const { data, error } = await supabase.from('articles').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data as ArticleDetail | null;
}

export async function haalTagsVoorArtikel(supabase: SupabaseClient, articleId: string) {
  const { data } = await supabase
    .from('article_tags')
    .select('tags(id, name)')
    .eq('article_id', articleId);
  return (data ?? []).map((r) => r.tags as unknown as Tag).filter(Boolean);
}

export type GesprekSamenvatting = { id: string; title: string | null; updated_at: string };

export async function haalGesprekken(
  supabase: SupabaseClient,
  userId: string,
): Promise<GesprekSamenvatting[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export type BerichtBron = { slug: string; title: string };
export type Bericht = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  bronnen: BerichtBron[];
};

export async function haalBerichten(supabase: SupabaseClient, conversationId: string): Promise<Bericht[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, cited_article_ids')
    .eq('conversation_id', conversationId)
    .order('created_at');
  if (error) throw error;

  const alleIds = [...new Set((data ?? []).flatMap((m) => m.cited_article_ids ?? []))];
  let artikelenPerId = new Map<string, BerichtBron>();
  if (alleIds.length > 0) {
    const { data: artikelen } = await supabase.from('articles').select('id, slug, title').in('id', alleIds);
    artikelenPerId = new Map((artikelen ?? []).map((a) => [a.id, { slug: a.slug, title: a.title }]));
  }

  return (data ?? []).map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    bronnen: (m.cited_article_ids ?? [])
      .map((id: string): BerichtBron | undefined => artikelenPerId.get(id))
      .filter((b: BerichtBron | undefined): b is BerichtBron => Boolean(b)),
  }));
}
