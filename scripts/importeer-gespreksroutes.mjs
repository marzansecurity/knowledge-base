/**
 * Importeert de gespreksroute-artikelen uit import/gespreksroutes/*.md.
 *
 * Deze artikelen zijn gedestilleerd uit de AI-flows van Daan (de assistent van
 * You Should Ask). De bot-mechaniek — connector-aanroepen, department-ID's,
 * buttonteksten — is er bewust uitgehaald: dit zijn artikelen voor mensen.
 *
 * Elk bestand begint met een kop tussen `---`-regels:
 *   titel, categorie (slug), tags (komma-gescheiden), samenvatting
 *
 * Idempotent: bij een tweede run wordt op slug bijgewerkt in plaats van
 * gedupliceerd. De nl-rij in article_translations wordt door de databasetrigger
 * `articles_spiegel_vertaling` bijgewerkt; dit script raakt die tabel niet aan.
 *
 *   node --env-file=.env.local scripts/importeer-gespreksroutes.mjs [--droogloop]
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const MAP = path.join(process.cwd(), 'import', 'gespreksroutes');
const DROOGLOOP = process.argv.includes('--droogloop');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

/** Zelfde slug-regels als maakSlug() in beheer/artikelen/acties.ts. */
function maakSlug(titel) {
  return (
    titel
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90) || 'artikel'
  );
}

/** Splitst de kop van de inhoud. Bewust geen YAML-parser: vier vaste velden. */
function leesBestand(ruw) {
  const match = ruw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error('geen kop tussen --- gevonden');

  const kop = {};
  for (const regel of match[1].split(/\r?\n/)) {
    const scheiding = regel.indexOf(':');
    if (scheiding === -1) continue;
    kop[regel.slice(0, scheiding).trim()] = regel.slice(scheiding + 1).trim();
  }

  for (const veld of ['titel', 'categorie', 'samenvatting']) {
    if (!kop[veld]) throw new Error(`veld "${veld}" ontbreekt in de kop`);
  }

  return {
    titel: kop.titel,
    categorieSlug: kop.categorie,
    samenvatting: kop.samenvatting,
    tags: (kop.tags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    inhoud: match[2].trim(),
  };
}

// --- Categorieën en tags vooraf ophalen ------------------------------------

const { data: categorieen, error: categorieFout } = await supabase
  .from('categories')
  .select('id, slug');
if (categorieFout) throw categorieFout;
const categorieIdPerSlug = new Map(categorieen.map((c) => [c.slug, c.id]));

const bestanden = (await readdir(MAP)).filter((b) => b.endsWith('.md')).sort();
console.log(`\n${bestanden.length} bestanden in import/gespreksroutes\n`);

const artikelen = [];
for (const bestand of bestanden) {
  try {
    const artikel = leesBestand(await readFile(path.join(MAP, bestand), 'utf8'));
    if (!categorieIdPerSlug.has(artikel.categorieSlug)) {
      throw new Error(`onbekende categorie "${artikel.categorieSlug}"`);
    }
    artikelen.push({ bestand, ...artikel, slug: maakSlug(artikel.titel) });
  } catch (fout) {
    console.error(`  FOUT  ${bestand}: ${fout.message}`);
    process.exitCode = 1;
  }
}
if (process.exitCode === 1) {
  console.error('\nAfgebroken — geen enkel artikel weggeschreven.\n');
  process.exit(1);
}

// Tags die nog niet bestaan aanmaken, zodat filteren op "gespreksroute" werkt.
const gevraagdeTags = [...new Set(artikelen.flatMap((a) => a.tags))];
const { data: bestaandeTags, error: tagFout } = await supabase
  .from('tags')
  .select('id, name')
  .in('name', gevraagdeTags);
if (tagFout) throw tagFout;

const tagIdPerNaam = new Map(bestaandeTags.map((t) => [t.name, t.id]));
const nieuweTags = gevraagdeTags.filter((t) => !tagIdPerNaam.has(t));

if (nieuweTags.length && !DROOGLOOP) {
  const { data, error } = await supabase
    .from('tags')
    .insert(nieuweTags.map((name) => ({ name })))
    .select('id, name');
  if (error) throw error;
  for (const t of data) tagIdPerNaam.set(t.name, t.id);
}
if (nieuweTags.length) console.log(`nieuwe tags: ${nieuweTags.join(', ')}\n`);

// --- Wegschrijven ----------------------------------------------------------

let nieuw = 0;
let bijgewerkt = 0;

for (const artikel of artikelen) {
  const { data: bestaand } = await supabase
    .from('articles')
    .select('id')
    .eq('slug', artikel.slug)
    .maybeSingle();

  const label = bestaand ? 'bijwerken' : 'nieuw    ';
  console.log(`  ${label}  ${artikel.slug}`);

  if (DROOGLOOP) {
    if (bestaand) bijgewerkt += 1;
    else nieuw += 1;
    continue;
  }

  const velden = {
    slug: artikel.slug,
    title: artikel.titel,
    summary: artikel.samenvatting,
    content_markdown: artikel.inhoud,
    category_id: categorieIdPerSlug.get(artikel.categorieSlug),
    // Concept: de redactie kijkt elk artikel na voordat het gepubliceerd wordt.
    status: 'draft',
    source: 'handmatig',
  };

  let artikelId;
  if (bestaand) {
    const { error } = await supabase.from('articles').update(velden).eq('id', bestaand.id);
    if (error) throw error;
    artikelId = bestaand.id;
    bijgewerkt += 1;
  } else {
    const { data, error } = await supabase.from('articles').insert(velden).select('id').single();
    if (error) throw error;
    artikelId = data.id;
    nieuw += 1;
  }

  const tagIds = artikel.tags.map((t) => tagIdPerNaam.get(t)).filter(Boolean);
  if (tagIds.length) {
    const { error } = await supabase
      .from('article_tags')
      .upsert(tagIds.map((tag_id) => ({ article_id: artikelId, tag_id })));
    if (error) throw error;
  }
}

console.log(
  `\n${DROOGLOOP ? 'Droogloop: ' : ''}${nieuw} nieuw, ${bijgewerkt} bijgewerkt.` +
    `${DROOGLOOP ? ' Niets weggeschreven.' : ' Alles staat op concept.'}\n`,
);
