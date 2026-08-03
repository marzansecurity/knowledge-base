import type { SupabaseClient } from '@supabase/supabase-js';
import type { ZipBestand } from '@/lib/zip';

/**
 * Bouwt alle bestanden voor de export: één Markdown-bestand per artikel
 * (elk status, niet alleen gepubliceerd — dit is de volledige back-up) plus
 * een JSON-manifest met alle metadata, categorieën en tags. Markdown is de
 * canonieke bron, dus dit maakt de kennisbank onafhankelijk van deze app:
 * elk ander systeem kan met deze bestanden verder.
 */
export async function bouwExportBestanden(supabase: SupabaseClient): Promise<ZipBestand[]> {
  const { data: categorieen } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, sort_order, active')
    .order('sort_order');

  const { data: tags } = await supabase.from('tags').select('id, name').order('name');

  const { data: artikelen } = await supabase
    .from('articles')
    .select(
      'id, slug, title, summary, content_markdown, status, category_id, source, source_article_id, published_at, reviewed_at, review_due_at, created_at, updated_at, article_tags(tags(name))',
    )
    .order('slug');

  const categorieOpId = new Map((categorieen ?? []).map((c) => [c.id, c]));

  const naarTagNamen = (a: { article_tags: unknown }) =>
    ((a.article_tags as { tags: { name: string } | null }[] | null) ?? [])
      .map((t) => t.tags?.name)
      .filter((n): n is string => Boolean(n));

  const manifestArtikelen = (artikelen ?? []).map((a) => {
    const categorie = a.category_id ? categorieOpId.get(a.category_id) : null;
    return {
      id: a.id,
      slug: a.slug,
      titel: a.title,
      samenvatting: a.summary,
      status: a.status,
      categorie: categorie ? { slug: categorie.slug, naam: categorie.name } : null,
      tags: naarTagNamen(a),
      bron: a.source,
      bron_artikel_id: a.source_article_id,
      gepubliceerd_op: a.published_at,
      laatst_gecontroleerd: a.reviewed_at,
      controle_vervalt_op: a.review_due_at,
      aangemaakt_op: a.created_at,
      bijgewerkt_op: a.updated_at,
      bestand: `artikelen/${a.slug}.md`,
    };
  });

  const manifest = {
    geexporteerd_op: new Date().toISOString(),
    manifest_versie: 1,
    aantal_artikelen: manifestArtikelen.length,
    categorieen: (categorieen ?? []).map((c) => ({
      id: c.id,
      naam: c.name,
      slug: c.slug,
      ouder_id: c.parent_id,
      volgorde: c.sort_order,
      actief: c.active,
    })),
    tags: (tags ?? []).map((t) => t.name),
    artikelen: manifestArtikelen,
  };

  const bestanden: ZipBestand[] = [
    { pad: 'manifest.json', inhoud: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8') },
  ];

  for (const a of artikelen ?? []) {
    const categorie = a.category_id ? categorieOpId.get(a.category_id) : null;
    const tagsVoorArtikel = naarTagNamen(a);

    const kopregels = [
      '---',
      `titel: ${a.title}`,
      `slug: ${a.slug}`,
      `status: ${a.status}`,
      categorie ? `categorie: ${categorie.name}` : null,
      tagsVoorArtikel.length ? `tags: ${tagsVoorArtikel.join(', ')}` : null,
      a.summary ? `samenvatting: ${a.summary}` : null,
      `laatst_bijgewerkt: ${a.updated_at}`,
      '---',
      '',
    ].filter((r): r is string => r !== null);

    const inhoud = `${kopregels.join('\n')}\n# ${a.title}\n\n${a.content_markdown}\n`;
    bestanden.push({ pad: `artikelen/${a.slug}.md`, inhoud: Buffer.from(inhoud, 'utf8') });
  }

  return bestanden;
}
