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
 * volgorde (plek in het onboarding-leerpad), verplicht (ja/nee), eigenaar
 * (display_name uit profiles).
 *
 * Elk artikel heeft een eigenaar nodig (AGENTS.md): de kop wint, anders
 * IMPORT_EIGENAAR uit .env.local. Is er geen van beide, of bestaat het profiel
 * niet, dan breekt het script af voordat er iets wordt weggeschreven.
 *
 * Idempotent: bij een tweede run wordt op slug bijgewerkt in plaats van
 * gedupliceerd. De nl-rij in article_translations wordt door de databasetrigger
 * `articles_spiegel_vertaling` bijgewerkt; dit script raakt die tabel niet aan.
 *
 * Bewerkingen in de app gaan voor. In import/importstatus.json staat per artikel
 * een vingerafdruk van wat er laatst is geïmporteerd. Wijkt de database daarvan
 * af, dan is het artikel in de app bewerkt en wordt het overgeslagen — anders
 * zou een import die bewerkingen ongemerkt terugdraaien. Dan kun je kiezen:
 *
 *   --haal-op      de app-versie naar het bestand halen (tekst en samenvatting)
 *   --overschrijf  toch de bestandsversie importeren; de app-bewerking gaat verloren
 *
 *   node --env-file=.env.local scripts/importeer-gespreksroutes.mjs [--droogloop] [--haal-op | --overschrijf]
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const MAPPEN = [
  {
    // De routes gelden voor alle webshops (bevestigd 1 sept 2026): landen leeg = overal.
    map: path.join(process.cwd(), 'import', 'gespreksroutes'),
    standaard: { type: 'gespreksroute', landen: [], kanaal: 'klantcontact' },
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
const HAAL_OP = process.argv.includes('--haal-op');
const OVERSCHRIJF = process.argv.includes('--overschrijf');
if (HAAL_OP && OVERSCHRIJF) {
  console.error('Kies --haal-op óf --overschrijf, niet allebei.');
  process.exit(1);
}

const STATUS_PAD = path.join(process.cwd(), 'import', 'importstatus.json');

/**
 * Vingerafdruk van de velden die dit script schrijft. Verandert er in de app
 * iets aan een van deze velden, dan verandert de vingerafdruk.
 */
function vingerafdruk(rij) {
  const tekst = (rij.content_markdown ?? '').replace(/\r\n/g, '\n').trim();
  const waarden = [
    rij.title ?? '',
    rij.summary ?? '',
    tekst,
    rij.category_id ?? null,
    rij.type ?? null,
    rij.channel ?? null,
    [...(rij.countries ?? [])].sort().join(','),
    rij.path_order ?? null,
    Boolean(rij.required_reading),
  ];
  return createHash('sha256').update(JSON.stringify(waarden)).digest('hex').slice(0, 16);
}

let importstatus = {};
try {
  importstatus = JSON.parse(await readFile(STATUS_PAD, 'utf8'));
} catch {
  // Nog geen statusbestand: wordt bij deze run aangemaakt.
}
const STANDAARD_EIGENAAR = process.env.IMPORT_EIGENAAR?.trim() || null;

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

  // Staat de eigenaar in de kop, dan is dat een bewuste keuze en overschrijft die
  // ook bij een herimport. Valt hij terug op IMPORT_EIGENAAR, dan alleen invullen
  // waar nog niets staat — zie het wegschrijven hieronder.
  const eigenaar = kop.eigenaar?.trim() || STANDAARD_EIGENAAR;
  if (!eigenaar) {
    throw new Error('geen eigenaar: zet "eigenaar" in de kop of IMPORT_EIGENAAR in .env.local');
  }

  return {
    titel: kop.titel,
    categorieSlug: kop.categorie,
    samenvatting: kop.samenvatting,
    type,
    landen,
    kanaal,
    volgorde,
    verplicht,
    eigenaar,
    eigenaarUitKop: Boolean(kop.eigenaar?.trim()),
    tags: (kop.tags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      // De tag "gespreksroute" is vervangen door het type-veld (briefing A1).
      .filter((t) => t !== 'gespreksroute'),
    inhoud: match[2].trim(),
  };
}

// --- Categorieën, profielen en tags vooraf ophalen --------------------------

const { data: categorieen, error: categorieFout } = await supabase
  .from('categories')
  .select('id, slug');
if (categorieFout) throw categorieFout;
const categorieIdPerSlug = new Map(categorieen.map((c) => [c.slug, c.id]));

const { data: profielen, error: profielFout } = await supabase
  .from('profiles')
  .select('user_id, display_name')
  .eq('active', true);
if (profielFout) throw profielFout;
const profielIdPerNaam = new Map(profielen.map((p) => [p.display_name, p.user_id]));

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
      if (!profielIdPerNaam.has(artikel.eigenaar)) {
        throw new Error(
          `onbekende eigenaar "${artikel.eigenaar}" — ` +
            `bekend zijn: ${[...profielIdPerNaam.keys()].join(', ')}`,
        );
      }
      artikelen.push({ bestand, map, ...artikel, slug: maakSlug(artikel.titel) });
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
let ongewijzigd = 0;
let overgeslagen = 0;
let opgehaald = 0;

for (const artikel of artikelen) {
  const { data: bestaand } = await supabase
    .from('articles')
    .select('id, owner_id, title, summary, content_markdown, category_id, type, channel, countries, path_order, required_reading')
    .eq('slug', artikel.slug)
    .maybeSingle();

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
    source: 'handmatig',
  };

  if (bestaand) {
    const inDatabase = vingerafdruk(bestaand);
    const laatstGeimporteerd = importstatus[artikel.slug];
    // Zonder eerdere vingerafdruk weten we niet wat nieuwer is: dan telt elk
    // verschil met het bestand als een bewerking in de app, en slaan we het over.
    const inAppBewerkt = laatstGeimporteerd ? inDatabase !== laatstGeimporteerd : inDatabase !== vingerafdruk(velden);

    if (inAppBewerkt && !OVERSCHRIJF) {
      if (HAAL_OP) {
        console.log(`  ophalen    ${artikel.slug}  ← app-versie naar ${path.basename(artikel.map)}/${artikel.bestand}`);
        opgehaald += 1;
        if (!DROOGLOOP) {
          const bestandspad = path.join(artikel.map, artikel.bestand);
          const ruw = (await readFile(bestandspad, 'utf8')).replace(/\r\n/g, '\n');
          const kop = ruw.match(/^---\n[\s\S]*?\n---\n/)[0];
          const samenvatting = (bestaand.summary ?? '').replace(/\s*\n\s*/g, ' ').trim();
          const nieuweKop = samenvatting ? kop.replace(/^samenvatting:.*$/m, `samenvatting: ${samenvatting}`) : kop;
          await writeFile(bestandspad, `${nieuweKop}\n${(bestaand.content_markdown ?? '').replace(/\r\n/g, '\n').trim()}\n`, 'utf8');
          importstatus[artikel.slug] = inDatabase;
        }
      } else {
        console.log(`  OVERGESLAGEN ${artikel.slug}  (in de app bewerkt sinds de laatste import)`);
        overgeslagen += 1;
      }
      continue;
    }

    if (!inAppBewerkt && inDatabase === vingerafdruk(velden)) {
      ongewijzigd += 1;
      if (!DROOGLOOP) importstatus[artikel.slug] = inDatabase;
      continue;
    }
  }

  const label = bestaand ? (OVERSCHRIJF ? 'overschrijf' : 'bijwerken') : 'nieuw    ';
  // Bij bijwerken alleen de eigenaar tonen als die daadwerkelijk wordt gezet.
  const toontEigenaar = !bestaand || artikel.eigenaarUitKop || !bestaand.owner_id;
  console.log(
    `  ${label}  [${artikel.type}] ${artikel.slug}` +
      (toontEigenaar ? `  → ${artikel.eigenaar}` : ''),
  );

  if (DROOGLOOP) {
    if (bestaand) bijgewerkt += 1;
    else nieuw += 1;
    continue;
  }

  const eigenaarId = profielIdPerNaam.get(artikel.eigenaar);

  let artikelId;
  if (bestaand) {
    // De status blijft bij bijwerken onaangeroerd: een al gepubliceerd artikel
    // mag door een herimport niet terugvallen naar concept. Hetzelfde geldt voor
    // de eigenaar: is die in de app aan iemand anders toegewezen, dan laat een
    // herimport dat met rust. Alleen een expliciete "eigenaar" in de kop, of een
    // artikel dat nog geen eigenaar heeft, wordt overschreven.
    if (artikel.eigenaarUitKop || !bestaand.owner_id) velden.owner_id = eigenaarId;

    const { error } = await supabase.from('articles').update(velden).eq('id', bestaand.id);
    if (error) throw error;
    artikelId = bestaand.id;
    bijgewerkt += 1;
  } else {
    // Concept: de redactie kijkt elk nieuw artikel na voordat het gepubliceerd wordt.
    const { data, error } = await supabase
      .from('articles')
      .insert({ ...velden, owner_id: eigenaarId, status: 'draft' })
      .select('id')
      .single();
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

  importstatus[artikel.slug] = vingerafdruk(velden);
}

if (!DROOGLOOP) {
  const gesorteerd = Object.fromEntries(Object.entries(importstatus).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(STATUS_PAD, `${JSON.stringify(gesorteerd, null, 2)}\n`, 'utf8');
}

console.log(
  `\n${DROOGLOOP ? 'Droogloop: ' : ''}${nieuw} nieuw, ${bijgewerkt} bijgewerkt, ${ongewijzigd} ongewijzigd` +
    (opgehaald ? `, ${opgehaald} opgehaald uit de app` : '') +
    (overgeslagen ? `, ${overgeslagen} OVERGESLAGEN` : '') +
    '.' +
    `${DROOGLOOP ? ' Niets weggeschreven.' : ' Nieuwe artikelen staan op concept; bestaande houden hun status.'}\n`,
);
if (overgeslagen) {
  console.log(
    'Overgeslagen artikelen zijn in de app bewerkt. Draai met --haal-op om die versie naar de bestanden te halen,\n' +
      'of met --overschrijf om toch de bestandsversie te importeren (de app-bewerking gaat dan verloren).\n',
  );
}
