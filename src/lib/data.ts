import type { SupabaseClient } from '@supabase/supabase-js';
import type { ArticleDetail, ArticleSummary, Category, Country, Supplier, SupplierType, Tag } from '@/lib/types';
import { STANDAARD_TAAL, type Taal } from '@/lib/talen';

/**
 * De talen die we voor een query opvragen: de gevraagde taal én het Nederlands
 * als terugval. Is het Nederlands zelf gevraagd, dan volstaat één taal.
 */
function talenMetTerugval(taal: Taal): Taal[] {
  return taal === STANDAARD_TAAL ? [STANDAARD_TAAL] : [taal, STANDAARD_TAAL];
}

/** Kiest per artikel de rij in de gevraagde taal, anders de Nederlandse. */
function kiesBesteVertaling<T extends { article_id: string; locale: Taal }>(
  rijen: T[],
  taal: Taal,
): Map<string, T> {
  const beste = new Map<string, T>();
  for (const rij of rijen) {
    const huidige = beste.get(rij.article_id);
    if (!huidige || rij.locale === taal) beste.set(rij.article_id, rij);
  }
  return beste;
}

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

/**
 * Categorieën met de weergavenaam in de gevraagde taal. De slug blijft
 * taalneutraal — die zit in filter-URL's en mag dus niet meebewegen.
 */
export async function haalCategorieen(supabase: SupabaseClient, taal: Taal): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*, category_translations(locale, name)')
    .eq('active', true)
    .order('sort_order');
  if (error) throw error;

  return (data ?? []).map((c) => {
    const vertalingen = (c.category_translations ?? []) as { locale: Taal; name: string }[];
    const vertaald = vertalingen.find((v) => v.locale === taal)?.name;
    return { ...c, name: vertaald ?? c.name } as Category;
  });
}

/**
 * Tags met de weergavenaam in de gevraagde taal. `name` blijft de Nederlandse
 * sleutel waarop gefilterd wordt; `label` is wat de gebruiker ziet.
 */
export async function haalTags(supabase: SupabaseClient, taal: Taal): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*, tag_translations(locale, name)')
    .order('name');
  if (error) throw error;

  return (data ?? []).map((t) => {
    const vertalingen = (t.tag_translations ?? []) as { locale: Taal; name: string }[];
    return {
      id: t.id,
      name: t.name,
      label: vertalingen.find((v) => v.locale === taal)?.name ?? t.name,
    } as Tag;
  });
}

type ArtikelFilter = {
  taal: Taal;
  categorySlug?: string;
  tagNamen?: string[];
  zoekterm?: string;
  statussen?: string[];
};

type VertalingRij = {
  article_id: string;
  locale: Taal;
  slug: string;
  title: string;
  summary: string | null;
  articles: {
    status: ArticleSummary['status'];
    category_id: string | null;
    reviewed_at: string | null;
    updated_at: string;
    path_order: number | null;
    required_reading: boolean;
  } | null;
};

/**
 * Haalt artikelen op in de gevraagde taal, met terugval op het Nederlands.
 * Gebruikt de databasefunctie zoek_artikelen zodra er een zoekterm is
 * (volledige-tekst per taal + tikfouttolerantie), anders een gewone lijstquery.
 */
export async function haalArtikelen(
  supabase: SupabaseClient,
  filter: ArtikelFilter,
): Promise<ArticleSummary[]> {
  const statussen = filter.statussen ?? ['published'];
  const { taal } = filter;

  if (filter.zoekterm?.trim()) {
    const { data, error } = await supabase.rpc('zoek_artikelen', {
      zoekterm: filter.zoekterm,
      taal,
    });
    if (error) throw error;

    type ZoekRij = Omit<ArticleSummary, 'vertaling_taal'> & { locale: Taal };
    let rijen = ((data ?? []) as ZoekRij[]).map(
      ({ locale, ...rest }): ArticleSummary => ({ ...rest, vertaling_taal: locale }),
    );

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
    .from('article_translations')
    .select(
      'article_id, locale, slug, title, summary, articles!inner(status, category_id, reviewed_at, updated_at, path_order, required_reading)',
    )
    .in('locale', talenMetTerugval(taal))
    .in('articles.status', statussen);

  if (filter.categorySlug) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', filter.categorySlug)
      .single();
    query = query.eq('articles.category_id', cat?.id ?? '00000000-0000-0000-0000-000000000000');
  }

  const { data, error } = await query;
  if (error) throw error;

  const beste = kiesBesteVertaling((data ?? []) as unknown as VertalingRij[], taal);

  let rijen: ArticleSummary[] = [...beste.values()]
    .filter((r) => r.articles !== null)
    .map((r) => ({
      id: r.article_id,
      slug: r.slug,
      title: r.title,
      summary: r.summary,
      status: r.articles!.status,
      category_id: r.articles!.category_id,
      reviewed_at: r.articles!.reviewed_at,
      updated_at: r.articles!.updated_at,
      path_order: r.articles!.path_order,
      required_reading: r.articles!.required_reading,
      vertaling_taal: r.locale,
      is_terugval: r.locale !== taal,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

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

/**
 * Eén artikel in de gevraagde taal.
 *
 * De slug wordt eerst in de gevraagde taal gezocht; levert dat niets op, dan in
 * het Nederlands. Zo blijven oude, Nederlandstalige links werken ook nadat een
 * artikel een eigen Franse of Engelse slug heeft gekregen.
 */
export async function haalArtikel(
  supabase: SupabaseClient,
  slug: string,
  taal: Taal,
): Promise<ArticleDetail | null> {
  type Rij = {
    article_id: string;
    locale: Taal;
    slug: string;
    title: string;
    summary: string | null;
    content_markdown: string;
  };

  const { data, error } = await supabase
    .from('article_translations')
    .select('article_id, locale, slug, title, summary, content_markdown')
    .eq('slug', slug)
    .in('locale', talenMetTerugval(taal));
  if (error) throw error;

  const treffers = (data ?? []) as Rij[];
  // Bewust in code kiezen: `locale` is een Postgres-enum, dus sorteren in de
  // database volgt de definitievolgorde (nl, en, fr) en niet de voorkeur hier.
  const vertaling = treffers.find((r) => r.locale === taal) ?? treffers[0];
  if (!vertaling) return null;

  // De metadata (status, eigenaar, data) hangt aan het artikel zelf, niet aan
  // de vertaling.
  const { data: artikel, error: artikelFout } = await supabase
    .from('articles')
    .select('*')
    .eq('id', vertaling.article_id)
    .maybeSingle();
  if (artikelFout) throw artikelFout;
  if (!artikel) return null;

  // Is er wél een vertaling in de gevraagde taal, maar kwamen we hier via de
  // Nederlandse slug? Dan die vertaling tonen.
  let getoond = vertaling;
  if (vertaling.locale !== taal) {
    const { data: beter } = await supabase
      .from('article_translations')
      .select('article_id, locale, slug, title, summary, content_markdown')
      .eq('article_id', vertaling.article_id)
      .eq('locale', taal)
      .maybeSingle();
    if (beter) getoond = beter;
  }

  return {
    ...artikel,
    slug: getoond.slug,
    title: getoond.title,
    summary: getoond.summary,
    content_markdown: getoond.content_markdown,
    vertaling_taal: getoond.locale,
    is_terugval: getoond.locale !== taal,
  } as ArticleDetail;
}

export async function haalTagsVoorArtikel(supabase: SupabaseClient, articleId: string, taal: Taal) {
  const { data } = await supabase
    .from('article_tags')
    .select('tags(id, name, tag_translations(locale, name))')
    .eq('article_id', articleId);

  type TagRij = { id: string; name: string; tag_translations: { locale: Taal; name: string }[] | null };

  return (data ?? [])
    .map((r) => r.tags as unknown as TagRij)
    .filter(Boolean)
    .map((t): Tag => ({
      id: t.id,
      name: t.name,
      label: (t.tag_translations ?? []).find((v) => v.locale === taal)?.name ?? t.name,
    }));
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

/**
 * Titel en slug van geciteerde artikelen, in de gevraagde taal met terugval op
 * het Nederlands. Zo wijzen de bronlinks onder een AI-antwoord naar de
 * taalversie die de lezer ook echt te zien krijgt.
 */
async function haalBronnenPerId(
  supabase: SupabaseClient,
  artikelIds: string[],
  taal: Taal,
): Promise<Map<string, BerichtBron>> {
  if (artikelIds.length === 0) return new Map();

  const { data } = await supabase
    .from('article_translations')
    .select('article_id, locale, slug, title')
    .in('article_id', artikelIds)
    .in('locale', talenMetTerugval(taal));

  const beste = kiesBesteVertaling(
    (data ?? []) as { article_id: string; locale: Taal; slug: string; title: string }[],
    taal,
  );
  return new Map([...beste].map(([id, r]) => [id, { slug: r.slug, title: r.title }]));
}

export async function haalBerichten(
  supabase: SupabaseClient,
  conversationId: string,
  taal: Taal,
): Promise<Bericht[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, cited_article_ids, helpful')
    .eq('conversation_id', conversationId)
    .order('created_at');
  if (error) throw error;

  const alleIds = [...new Set((data ?? []).flatMap((m) => m.cited_article_ids ?? []))];
  const artikelenPerId = await haalBronnenPerId(supabase, alleIds, taal);

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
export async function haalNietNuttigeAntwoorden(
  supabase: SupabaseClient,
  taal: Taal,
): Promise<NietNuttigAntwoord[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(
      'id, content, origin_question, cited_article_ids, created_at, conversations(user_id, profiles(display_name))',
    )
    .eq('helpful', false)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const alleIds = [...new Set((data ?? []).flatMap((m) => m.cited_article_ids ?? []))];
  const artikelenPerId = await haalBronnenPerId(supabase, alleIds, taal);

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
  /**
   * Hoeveel open escalaties een vergelijkbare vraag hebben, inclusief deze zelf
   * (dus minimaal 1). Alleen berekend voor open escalaties; anders 1.
   */
  aantal_vergelijkbaar: number;
};

/**
 * Alle geëscaleerde AI-antwoorden. Open escalaties krijgen hun frequentie mee
 * (briefing C3): hoe vaak een vergelijkbare vraag terugkomt, zodat de inbox op
 * aantal kan sorteren in plaats van chronologisch.
 */
export async function haalEscalaties(
  supabase: SupabaseClient,
  filter: { alleenOpen?: boolean; sindsDagen?: number } = {},
): Promise<Escalatie[]> {
  let query = supabase
    .from('messages')
    .select(
      'id, content, origin_question, created_at, resolved_at, resolution_note, conversations(user_id, profiles(display_name))',
    )
    .eq('escalated', true)
    .order('created_at', { ascending: false });

  if (filter.alleenOpen) query = query.is('resolved_at', null);
  if (filter.sindsDagen) {
    const sinds = new Date();
    sinds.setDate(sinds.getDate() - filter.sindsDagen);
    query = query.gte('created_at', sinds.toISOString());
  }

  const [{ data, error }, { data: frequenties }] = await Promise.all([
    query,
    supabase.rpc('escalatie_frequenties'),
  ]);
  if (error) throw error;

  const aantalPerId = new Map(
    ((frequenties ?? []) as { message_id: string; aantal: number }[]).map((f) => [f.message_id, f.aantal]),
  );

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
      aantal_vergelijkbaar: aantalPerId.get(m.id) ?? 1,
    };
  });
}

export type ReviewVerlopenArtikel = {
  id: string;
  slug: string;
  title: string;
  review_due_at: string;
  eigenaar: string | null;
};

/**
 * Gepubliceerde artikelen waarvan de reviewdatum is verstreken (briefing A5),
 * met de eigenaar erbij — die is aanspreekbaar voor de inhoud.
 */
export async function haalReviewVerlopen(supabase: SupabaseClient): Promise<ReviewVerlopenArtikel[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('id, slug, title, review_due_at, profiles!articles_owner_id_fkey(display_name)')
    .eq('status', 'published')
    .not('review_due_at', 'is', null)
    .lt('review_due_at', new Date().toISOString())
    .order('review_due_at');
  if (error) throw error;

  return (data ?? []).map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    review_due_at: a.review_due_at,
    eigenaar: (a.profiles as unknown as { display_name: string } | null)?.display_name ?? null,
  }));
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

export type ArtikelVoorstel = {
  id: string;
  title: string;
  summary: string | null;
  content_markdown: string;
  status: 'open' | 'aangemaakt' | 'afgewezen';
  created_at: string;
  bronVragen: string[];
};

/** Door de AI gegenereerde artikel-voorstellen op basis van herhaalde escalaties. */
export async function haalArtikelVoorstellen(
  supabase: SupabaseClient,
  filter: { alleenOpen?: boolean } = {},
): Promise<ArtikelVoorstel[]> {
  let query = supabase
    .from('article_proposals')
    .select('id, title, summary, content_markdown, status, source_message_ids, created_at')
    .order('created_at', { ascending: false });
  if (filter.alleenOpen) query = query.eq('status', 'open');

  const { data, error } = await query;
  if (error) throw error;

  const alleMessageIds = [...new Set((data ?? []).flatMap((v) => v.source_message_ids ?? []))];
  let vraagPerId = new Map<string, string>();
  if (alleMessageIds.length > 0) {
    const { data: berichten } = await supabase
      .from('messages')
      .select('id, origin_question')
      .in('id', alleMessageIds);
    vraagPerId = new Map((berichten ?? []).map((b) => [b.id, b.origin_question ?? '(vraag onbekend)']));
  }

  return (data ?? []).map((v) => ({
    id: v.id,
    title: v.title,
    summary: v.summary,
    content_markdown: v.content_markdown,
    status: v.status,
    created_at: v.created_at,
    bronVragen: (v.source_message_ids ?? []).map((id: string) => vraagPerId.get(id) ?? '(vraag onbekend)'),
  }));
}

export async function telOpenArtikelVoorstellen(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('article_proposals')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open');
  if (error) throw error;
  return count ?? 0;
}
