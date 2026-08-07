import type { SupabaseClient } from '@supabase/supabase-js';
import type { ArticleDetail, ArticleSummary, Category, Country, Supplier, SupplierType, Tag } from '@/lib/types';

/** Haalt leveranciers op, eventueel gefilterd op land (NL/BE/UK) en/of type (fulfilment/dropshipment/installateur). */
export async function haalLeveranciers(
  supabase: SupabaseClient,
  filter: { countries?: Country[]; types?: SupplierType[] } = {},
): Promise<Supplier[]> {
  let query = supabase.from('suppliers').select('*').order('name');
  if (filter.countries?.length) query = query.overlaps('countries', filter.countries);
  if (filter.types?.length) query = query.overlaps('types', filter.types);

  const { data, error } = await query;
  if (error) throw error;
  return data as Supplier[];
}

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
  helpful: boolean | null;
};

export async function haalBerichten(supabase: SupabaseClient, conversationId: string): Promise<Bericht[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, cited_article_ids, helpful')
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
    helpful: m.helpful,
  }));
}

export type NietNuttigAntwoord = {
  id: string;
  vraag: string;
  antwoord: string;
  gebruiker: string;
  created_at: string;
  bronnen: BerichtBron[];
};

/** AI-antwoorden die een medewerker als "niet nuttig" heeft gemarkeerd — signaal voor zwakke artikelen. */
export async function haalNietNuttigeAntwoorden(supabase: SupabaseClient): Promise<NietNuttigAntwoord[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(
      'id, content, origin_question, cited_article_ids, created_at, conversations(user_id, profiles(display_name))',
    )
    .eq('helpful', false)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const alleIds = [...new Set((data ?? []).flatMap((m) => m.cited_article_ids ?? []))];
  let artikelenPerId = new Map<string, BerichtBron>();
  if (alleIds.length > 0) {
    const { data: artikelen } = await supabase.from('articles').select('id, slug, title').in('id', alleIds);
    artikelenPerId = new Map((artikelen ?? []).map((a) => [a.id, { slug: a.slug, title: a.title }]));
  }

  return (data ?? []).map((m) => {
    const gesprek = m.conversations as unknown as {
      user_id: string;
      profiles: { display_name: string } | null;
    } | null;
    return {
      id: m.id,
      vraag: m.origin_question ?? '(vraag onbekend)',
      antwoord: m.content,
      gebruiker: gesprek?.profiles?.display_name ?? 'Onbekend',
      created_at: m.created_at,
      bronnen: (m.cited_article_ids ?? [])
        .map((id: string): BerichtBron | undefined => artikelenPerId.get(id))
        .filter((b: BerichtBron | undefined): b is BerichtBron => Boolean(b)),
    };
  });
}

export type Escalatie = {
  id: string;
  vraag: string;
  antwoord: string;
  gebruiker: string;
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
};

/** Alle geëscaleerde AI-antwoorden, nieuwste eerst. Basis voor de escalatie-inbox in beheer. */
export async function haalEscalaties(
  supabase: SupabaseClient,
  filter: { alleenOpen?: boolean } = {},
): Promise<Escalatie[]> {
  let query = supabase
    .from('messages')
    .select(
      'id, content, origin_question, created_at, resolved_at, resolution_note, conversations(user_id, profiles(display_name))',
    )
    .eq('escalated', true)
    .order('created_at', { ascending: false });

  if (filter.alleenOpen) query = query.is('resolved_at', null);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((m) => {
    const gesprek = m.conversations as unknown as {
      user_id: string;
      profiles: { display_name: string } | null;
    } | null;
    return {
      id: m.id,
      vraag: m.origin_question ?? '(vraag onbekend)',
      antwoord: m.content,
      gebruiker: gesprek?.profiles?.display_name ?? 'Onbekend',
      created_at: m.created_at,
      resolved_at: m.resolved_at,
      resolution_note: m.resolution_note,
    };
  });
}

export async function telOpenEscalaties(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('escalated', true)
    .is('resolved_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function telNietNuttigeAntwoorden(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('helpful', false);
  if (error) throw error;
  return count ?? 0;
}

/** Welke artikelen een medewerker al als gelezen heeft afgevinkt, voor de onboarding-checklist. */
export async function haalGelezenArtikelIds(
  supabase: SupabaseClient,
  profileId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('article_reads')
    .select('article_id')
    .eq('profile_id', profileId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.article_id as string));
}
