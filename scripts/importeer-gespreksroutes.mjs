/**
 * Importeert handgeschreven Markdown-artikelen uit twee mappen:
 *
 *   import/gespreksroutes/*.md  — gedestilleerd uit de AI-flows van Daan (de
 *                                 assistent van You Should Ask); standaardtype
 *                                 "gespreksroute", scope NL/klantcontact
 *   import/artikelen/*.md       — overige handgeschreven artikelen (naslag,
 *                                 procedures, producttraining) uit de
 *                                 schrijfroute; het type staat in de kop
 *
 * Elk bestand begint met een kop tussen `---`-regels. Verplicht: titel,
 * categorie (slug), samenvatting. Optioneel: tags (komma-gescheiden), type
 * (gespreksroute/procedure/naslag/producttraining), landen (nl,be,uk of
 * "alle" voor overal geldig), kanaal (klantcontact/backoffice/technisch/alle),
 * volgorde (plek in het onboarding-leerpad), verplicht (ja/nee).
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

const MAPPEN = [
  {
    map: path.join(process.cwd(), 'import', 'gespreksroutes'),
    standaard: { type: 'gespreksroute', landen: ['NL'], kanaal: 'klantcontact' },
  },
  {
    map: path.join(process.cwd(), 'import', 'artikelen'),
    standaard: { type: null, landen: [], kanaal: 'alle' },
  },
];

const TYPES = ['gespreksroute', 'procedure', 'naslag', 'producttraining'];
const KANALEN = ['klantcontact', 'backoffice', 'technisch', 'alle'];
const LANDEN = ['NL', 'BE', 'UK'];

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

/** Splitst de kop van de inhoud. Bewust geen YAML-parser: vaste, platte velden. */
function leesBestand(ruw, standaard) {
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

  const type = kop.type ?? standaard.type;
  if (!TYPES.includes(type)) {
    throw new Error(`veld "type" moet één van ${TYPES.join('/')} zijn (nu: "${type ?? 'leeg'}")`);
  }

  // "alle" of "overal" betekent: geldt overal — leeg array in de database.
  let landen = standaard.landen;
  if (kop.landen) {
    const ruweLanden = kop.landen.split(',').map((l) => l.trim().toUpperCase()).filter(Boolean);
    landen = ruweLanden.some((l) => l === 'ALLE' || l === 'OVERAL') ? [] : ruweLanden;
    for (const land of landen) {
      if (!LANDEN.includes(land)) throw new Error(`onbekend land "${land}" (nl, be, uk of alle)`);
    }
  }

  const kanaal = kop.kanaal ?? standaard.kanaal;
  if (!KANALEN.includes(kanaal)) {
    throw new Error(`veld "kanaal" moet één van ${KANALEN.join('/')} zijn (nu: "${kanaal}")`);
  }

  let volgorde = null;
  if (kop.volgorde) {
    volgorde = Number.parseInt(kop.volgorde, 10);
    if (!Number.isFinite(volgorde)) throw new Error(`veld "volgorde" is geen getal: "${kop.volgorde}"`);
  }

  const verplicht = ['ja', 'true', '1'].includes((kop.verplicht ?? '').toLowerCase());

  return {
    titel: kop.titel,
    categorieSlug: kop.categorie,
    samenvatting: kop.samenvatting,
    type,
    landen,
    kanaal,
    volgorde,
    verplicht,
    tags: (kop.tags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      // De tag "gespreksroute" is vervangen door het type-veld (briefing A1).
      .filter((t) => t !== 'gespreksroute'),
    inhoud: match[2].trim(),
  };
}

// --- Categorieën en tags vooraf ophalen ------------------------------------

const { data: categorieen, error: categorieFout } = await supabase
  .from('categories')
  .select('id, slug');
if (categorieFout) throw categorieFout;
const categorieIdPerSlug = new Map(categorieen.map((c) => [c.slug, c.id]));

const artikelen = [];
for (const { map, standaard } of MAPPEN) {
  let bestanden = [];
  try {
    bestanden = (await readdir(map)).filter((b) => b.endsWith('.md')).sort();
  } catch {
    continue; // Map bestaat (nog) niet — geen fout, gewoon niets te doen.
  }
  console.log(`\n${bestanden.length} bestanden in ${path.relative(process.cwd(), map)}`);

  for (const bestand of bestanden) {
    try {
      const artikel = leesBestand(await readFile(path.join(map, bestand), 'utf8'), standaard);
      if (!categorieIdPerSlug.has(artikel.categorieSlug)) {
        throw new Error(`onbekende categorie "${artikel.categorieSlug}"`);
      }
      artikelen.push({ bestand, ...artikel, slug: maakSlug(artikel.titel) });
    } catch (fout) {
      console.error(`  FOUT  ${bestand}: ${fout.message}`);
      process.exitCode = 1;
    }
  }
}
if (process.exitCode === 1) {
  console.error('\nAfgebroken — geen enkel artikel weggeschreven.\n');
  process.exit(1);
}
console.log('');

// Tags die nog niet bestaan aanmaken, zodat filteren erop werkt.
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
  console.log(`  ${label}  [${artikel.type}] ${artikel.slug}`);

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
    type: artikel.type,
    countries: artikel.landen,
    channel: artikel.kanaal,
    path_order: artikel.volgorde,
    required_reading: artikel.verplicht,
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
