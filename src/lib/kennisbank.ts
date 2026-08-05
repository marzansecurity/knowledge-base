import type { SupabaseClient } from '@supabase/supabase-js';

export type KennisbankArtikel = {
  id: string;
  slug: string;
  title: string;
  categorie: string | null;
};

export type Kennisbank = {
  /** Het volledige artikelblok, klaar om als system-tekst mee te sturen. */
  systeemblok: string;
  aantalArtikelen: number;
  /** Voor het valideren en opzoeken van de bronnen die het model teruggeeft. */
  artikelen: Map<string, KennisbankArtikel>;
};

/**
 * Bouwt het artikelblok voor de AI-assistent: alle gepubliceerde artikelen in
 * één tekst. Dit is de enige plek waar dit blok wordt samengesteld — mocht de
 * kennisbank ooit richting 300+ artikelen groeien, dan is dit de plek voor een
 * selectiestap, zonder dat de rest van de app hoeft te veranderen.
 *
 * Concepten, verouderde en gearchiveerde artikelen komen hier nooit in.
 */
export async function bouwKennisbank(
  supabase: SupabaseClient,
  opties: { toegestaneCategorieIds?: Set<string> | null } = {},
): Promise<Kennisbank> {
  const { data: artikelen, error } = await supabase
    .from('articles')
    .select('id, slug, title, content_markdown, category_id, categories(name), article_tags(tags(name))')
    .eq('status', 'published')
    .order('title');
  if (error) throw error;

  const toegestaan = opties.toegestaneCategorieIds ?? null;
  const artikelMap = new Map<string, KennisbankArtikel>();
  const delen: string[] = [];

  for (const a of artikelen ?? []) {
    // Ongecategoriseerde artikelen zijn altijd zichtbaar; een gecategoriseerd
    // artikel alleen als de medewerker daarvoor toegang heeft. De aanroeper is
    // verantwoordelijk voor het toevoegen van altijd-zichtbare categorieën
    // (zoals "Start hier") aan toegestaneCategorieIds — zie route.ts.
    if (toegestaan && a.category_id && !toegestaan.has(a.category_id)) continue;

    const categorie = (a.categories as unknown as { name: string } | null)?.name ?? null;
    const tags = ((a.article_tags as unknown as { tags: { name: string } | null }[]) ?? [])
      .map((t) => t.tags?.name)
      .filter((n): n is string => Boolean(n));

    artikelMap.set(a.id, { id: a.id, slug: a.slug, title: a.title, categorie });

    delen.push(
      [
        `### ARTIKEL ${a.id}`,
        `Titel: ${a.title}`,
        categorie ? `Categorie: ${categorie}` : null,
        tags.length ? `Tags: ${tags.join(', ')}` : null,
        '',
        a.content_markdown,
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
