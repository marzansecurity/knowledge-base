import type { SupabaseClient } from '@supabase/supabase-js';
import { STANDAARD_TAAL, type Taal } from '@/lib/talen';

export type KennisbankArtikel = {
  id: string;
  slug: string;
  title: string;
  categorie: string | null;
  /** De taal waarin dit artikel is meegegeven — 'nl' betekent mogelijk terugval. */
  taal: Taal;
};

export type Kennisbank = {
  /** Het volledige artikelblok, klaar om als system-tekst mee te sturen. */
  systeemblok: string;
  aantalArtikelen: number;
  /** Voor het valideren en opzoeken van de bronnen die het model teruggeeft. */
  artikelen: Map<string, KennisbankArtikel>;
};

type Rij = {
  article_id: string;
  locale: Taal;
  slug: string;
  title: string;
  content_markdown: string;
  articles: {
    category_id: string | null;
    type: string;
    countries: string[];
    channel: string;
    categories: { name: string } | null;
    article_tags: { tags: { name: string } | null }[] | null;
  } | null;
};

/**
 * Bouwt het artikelblok voor de AI-assistent: alle gepubliceerde artikelen in
 * één tekst, in de taal van de gebruiker. Ontbreekt een vertaling, dan gaat het
 * Nederlandse artikel mee — met een expliciet taallabel, zodat het model weet
 * dat de bron een andere taal heeft dan het antwoord moet krijgen.
 *
 * Dit is de enige plek waar dit blok wordt samengesteld — mocht de kennisbank
 * ooit richting 300+ artikelen groeien, dan is dit de plek voor een
 * selectiestap, zonder dat de rest van de app hoeft te veranderen.
 *
 * Concepten, verouderde en gearchiveerde artikelen komen hier nooit in.
 */
export async function bouwKennisbank(
  supabase: SupabaseClient,
  opties: { taal: Taal; toegestaneCategorieIds?: Set<string> | null },
): Promise<Kennisbank> {
  const { taal } = opties;

  // Zowel de gevraagde taal als het Nederlands ophalen; hieronder kiezen we per
  // artikel de beste. Eén query, dus geen tweede rondje naar de database.
  const talen = taal === STANDAARD_TAAL ? [STANDAARD_TAAL] : [taal, STANDAARD_TAAL];

  const { data, error } = await supabase
    .from('article_translations')
    .select(
      'article_id, locale, slug, title, content_markdown, articles!inner(category_id, status, type, countries, channel, categories(name), article_tags(tags(name)))',
    )
    .eq('articles.status', 'published')
    .in('locale', talen)
    .order('title');
  if (error) throw error;

  const rijen = (data ?? []) as unknown as Rij[];

  // Per artikel de gevraagde taal, anders het Nederlands.
  const beste = new Map<string, Rij>();
  for (const rij of rijen) {
    const huidige = beste.get(rij.article_id);
    if (!huidige || rij.locale === taal) beste.set(rij.article_id, rij);
  }

  const toegestaan = opties.toegestaneCategorieIds ?? null;
  const artikelMap = new Map<string, KennisbankArtikel>();
  const delen: string[] = [];

  for (const rij of [...beste.values()].sort((a, b) => a.title.localeCompare(b.title))) {
    const categorieId = rij.articles?.category_id ?? null;

    // Ongecategoriseerde artikelen zijn altijd zichtbaar; een gecategoriseerd
    // artikel alleen als de medewerker daarvoor toegang heeft. De aanroeper is
    // verantwoordelijk voor het toevoegen van altijd-zichtbare categorieën
    // (zoals "Start hier") aan toegestaneCategorieIds — zie route.ts.
    if (toegestaan && categorieId && !toegestaan.has(categorieId)) continue;

    const categorie = rij.articles?.categories?.name ?? null;
    const tags = (rij.articles?.article_tags ?? [])
      .map((t) => t.tags?.name)
      .filter((n): n is string => Boolean(n));

    artikelMap.set(rij.article_id, {
      id: rij.article_id,
      slug: rij.slug,
      title: rij.title,
      categorie,
      taal: rij.locale,
    });

    // De scope als data (briefing A4), zodat het model niet hoeft af te leiden
    // uit de lopende tekst voor welke webshop of welk kanaal iets geldt.
    const landen = rij.articles?.countries ?? [];
    const geldigVoor = `${landen.length > 0 ? landen.join('/') : 'alle landen'} · ${rij.articles?.channel ?? 'alle'}`;

    delen.push(
      [
        `### ARTIKEL ${rij.article_id}`,
        `Titel: ${rij.title}`,
        // Alleen vermelden als het artikel níét in de gevraagde taal is; anders
        // is het ruis in de prompt.
        rij.locale !== taal ? `Taal: ${rij.locale}` : null,
        rij.articles?.type ? `Type: ${rij.articles.type}` : null,
        `Geldig voor: ${geldigVoor}`,
        categorie ? `Categorie: ${categorie}` : null,
        tags.length ? `Tags: ${tags.join(', ')}` : null,
        '',
        rij.content_markdown,
      ]
        .filter((regel): regel is string => regel !== null)
        .join('\n'),
    );
  }

  return {
    systeemblok: delen.join('\n\n---\n\n'),
    aantalArtikelen: artikelMap.size,
    artikelen: artikelMap,
  };
}
