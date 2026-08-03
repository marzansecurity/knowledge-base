/**
 * Zet de opgehaalde Zoho-artikelen om naar Markdown en importeert ze als draft.
 *
 *   node --env-file=.env.local scripts/importeer.mjs --droogloop   (niets wegschrijven)
 *   node --env-file=.env.local scripts/importeer.mjs               (echt importeren)
 *
 * Vereist: scripts/zoho-ophalen.mjs is gedraaid, en import/categorie-mapping.csv
 * bestaat (eventueel door jou aangepast).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const DROOGLOOP = process.argv.includes('--droogloop');
const RUW = 'import/zoho-ruw';
const MAPPING = 'import/categorie-mapping.csv';

// --- Hulpfuncties -----------------------------------------------------------

/** Minimale CSV-lezer voor puntkomma-gescheiden bestanden met quotes. */
function leesCsv(tekst) {
  const rijen = [];
  let veld = '';
  let rij = [];
  let inQuote = false;

  const schoon = tekst.replace(/^﻿/, '');
  for (let i = 0; i < schoon.length; i += 1) {
    const c = schoon[i];
    if (inQuote) {
      if (c === '"') {
        if (schoon[i + 1] === '"') {
          veld += '"';
          i += 1;
        } else inQuote = false;
      } else veld += c;
    } else if (c === '"') inQuote = true;
    else if (c === ';') {
      rij.push(veld);
      veld = '';
    } else if (c === '\n') {
      rij.push(veld);
      rijen.push(rij);
      rij = [];
      veld = '';
    } else if (c !== '\r') veld += c;
  }
  if (veld.length > 0 || rij.length > 0) {
    rij.push(veld);
    rijen.push(rij);
  }

  const koppen = rijen.shift();
  return rijen
    .filter((r) => r.some((v) => v.trim() !== ''))
    .map((r) => Object.fromEntries(koppen.map((k, i) => [k, (r[i] ?? '').trim()])));
}

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '_',
});
turndown.use(gfm);
// Zoho zet lege paragrafen en spacer-divs in de HTML; die willen we niet.
turndown.addRule('legeElementen', {
  filter: (node) =>
    ['P', 'DIV', 'SPAN'].includes(node.nodeName) && node.textContent.trim() === '' && !node.querySelector('img'),
  replacement: () => '',
});

/**
 * Bewerkt de afbeeldingen in de Zoho-HTML voordat er Markdown van wordt gemaakt:
 * opmaakiconen eruit, geredde afbeeldingen naar hun nieuwe adres, en dode
 * verwijzingen vervangen door een zichtbare melding.
 */
function bewerkAfbeeldingen(html, afbeeldingMap) {
  const telling = { icoon: 0, gered: 0, dood: 0, extern: 0 };

  const nieuw = html.replace(/<img[^>]*>/gi, (tag) => {
    const src = tag.match(/src="([^"]+)"/i)?.[1] ?? '';

    // Opmaakversiering van de Zoho-editor: geen inhoud.
    if (/static\.zohocdn\.com\/zoho-desk-editor/i.test(src)) {
      telling.icoon += 1;
      return '';
    }

    // Gered naar onze eigen opslag.
    const pad = afbeeldingMap[src];
    if (pad) {
      telling.gered += 1;
      const alt = tag.match(/alt="([^"]*)"/i)?.[1] ?? '';
      return `<img src="/api/afbeelding/${pad}" alt="${alt}">`;
    }

    // Freshdesk-resten: die bestanden zijn er niet meer.
    if (/s3\.amazonaws\.com|freshdesk\.com/i.test(src)) {
      telling.dood += 1;
      return '<em>[afbeelding niet beschikbaar — verloren bij de migratie uit Freshdesk]</em>';
    }

    telling.extern += 1;
    return tag;
  });

  return { html: nieuw, telling };
}

/** Kosmetische opschoning van wat Turndown oplevert. */
function schoonMarkdown(md) {
  return (
    md
      // Turndown zet drie spaties na een opsommingsteken; twee is genoeg.
      .replace(/^- {3}/gm, '- ')
      // Horizontale lijn uniform maken.
      .replace(/^\* \* \*$/gm, '---')
      // "### 1\. Titel" → "### 1. Titel" (escape is in een kop niet nodig).
      .replace(/^(#{1,6} .*)$/gm, (regel) => regel.replace(/\\\./g, '.'))
      // Maximaal één lege regel achter elkaar.
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

const checksum = (s) => createHash('sha256').update(s ?? '').digest('hex').slice(0, 16);

function maakSlug(permalink, titel, gebruikt) {
  const basis =
    (permalink && permalink.trim()) ||
    titel
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) ||
    'artikel';
  let slug = basis;
  let n = 2;
  while (gebruikt.has(slug)) {
    slug = `${basis}-${n}`;
    n += 1;
  }
  gebruikt.add(slug);
  return slug;
}

// --- Inlezen ----------------------------------------------------------------

if (!existsSync(`${RUW}/_index.json`)) {
  console.error(`Geen opgehaalde artikelen gevonden in ${RUW}/.`);
  console.error('Draai eerst: node --env-file=.env.local scripts/zoho-ophalen.mjs');
  process.exit(1);
}
if (!existsSync(MAPPING)) {
  console.error(`${MAPPING} ontbreekt. Draai eerst: node scripts/maak-mapping.mjs`);
  process.exit(1);
}

const mapping = new Map(leesCsv(readFileSync(MAPPING, 'utf8')).map((r) => [r.id, r]));

const afbeeldingMap = existsSync('import/afbeeldingen-map.json')
  ? JSON.parse(readFileSync('import/afbeeldingen-map.json', 'utf8'))
  : {};
if (Object.keys(afbeeldingMap).length === 0) {
  console.warn(
    'Let op: import/afbeeldingen-map.json ontbreekt of is leeg.\n' +
      'Draai eerst scripts/afbeeldingen-ophalen.mjs, anders blijven de\n' +
      'Zoho-afbeeldingen naar Zoho verwijzen.\n',
  );
}

const bestanden = readdirSync(RUW).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const ruwe = bestanden.map((f) => JSON.parse(readFileSync(`${RUW}/${f}`, 'utf8')));

console.log(`${ruwe.length} artikelen ingelezen, ${mapping.size} mappingregels.\n`);

// --- Verwerken --------------------------------------------------------------

const gebruikteSlugs = new Set();
const verwerkt = [];
const zonderMapping = [];

for (const a of ruwe) {
  const regel = mapping.get(a.id);
  if (!regel) zonderMapping.push(a.title);

  const html = a.answer ?? '';
  const { html: htmlBewerkt, telling } = bewerkAfbeeldingen(html, afbeeldingMap);
  const markdown = schoonMarkdown(turndown.turndown(htmlBewerkt));

  const afbeeldingen = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1]);
  const links = [...html.matchAll(/href="(https?:\/\/[^"]+)"/gi)].map((m) => m[1]);

  const signalen = [];
  const tekst = `${a.title} ${markdown}`;
  if (/freshdesk/i.test(tekst)) signalen.push('noemt Freshdesk — vrijwel zeker verouderd');
  if (/credit ?safe/i.test(tekst)) signalen.push('noemt Credit Safe — vervangen door creditchecken.nl');
  if (markdown.length < 200) signalen.push(`nauwelijks inhoud (${markdown.length} tekens)`);
  if (links.some((l) => /drive\.google|docs\.google/i.test(l)) && markdown.length < 600)
    signalen.push('vooral een Google Drive-link, weinig eigen inhoud');
  if (telling.dood > 0)
    signalen.push('afbeeldingen definitief kwijt — tekst mogelijk onvolledig zonder screenshots');
  if (telling.gered > 0) signalen.push('afbeeldingen overgezet naar eigen opslag');
  if (a.status === 'Draft') signalen.push('was al draft in Zoho');
  if (a.status === 'Unpublished') signalen.push('was unpublished in Zoho');
  if (!a.category?.name) signalen.push('geen categorie in Zoho');
  const jaar = new Date(a.modifiedTime).getFullYear();
  if (jaar < 2025) signalen.push(`niet gewijzigd sinds ${jaar}`);
  if (regel?.signalen?.includes('mogelijk duplicaat')) signalen.push('mogelijk duplicaat');

  verwerkt.push({
    zohoId: a.id,
    titel: a.title.trim(),
    slug: maakSlug(a.permalink, a.title, gebruikteSlugs),
    samenvatting: (a.summary ?? '').trim().slice(0, 400) || null,
    markdown,
    checksum: checksum(html),
    categorieNaam: regel?.nieuwe_categorie ?? null,
    tags: (regel?.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean),
    zohoCategorie: a.category?.name ?? null,
    zohoStatus: a.status,
    afbeeldingen,
    telling,
    signalen,
  });
}

// --- Reviewrapport ----------------------------------------------------------

const perSignaal = new Map();
for (const v of verwerkt) {
  for (const s of v.signalen) {
    const kern = s.replace(/\(.*?\)/, '').replace(/sinds \d{4}/, 'sinds vóór 2025').trim();
    if (!perSignaal.has(kern)) perSignaal.set(kern, []);
    perSignaal.get(kern).push(v);
  }
}

const PRIORITEIT = [
  '213858000001041361',
  '213858000008627004',
  '213858000008614036',
];

const regels = [];
regels.push('# Reviewrapport Zoho-import\n');
regels.push(`Gegenereerd op ${new Date().toLocaleString('nl-NL')}. ${verwerkt.length} artikelen.\n`);
regels.push(
  'Alles is geïmporteerd als **draft**. Niets is gepubliceerd. Loop dit rapport door en publiceer in de app wat klopt.\n',
);

regels.push('\n## Prioriteit — eerst beoordelen\n');
regels.push('Deze artikelen zijn recent gemaakt en inhoudelijk actueel.\n');
for (const v of verwerkt.filter(
  (v) => PRIORITEIT.includes(v.zohoId) || /opvolging installatie-orders/i.test(v.titel),
)) {
  regels.push(`- **${v.titel}** — ${v.categorieNaam ?? 'geen categorie'} (${v.markdown.length} tekens)`);
}

regels.push('\n## Signalen\n');
regels.push('| Signaal | Artikelen |');
regels.push('|---|---:|');
for (const [s, lijst] of [...perSignaal.entries()].sort((a, b) => b[1].length - a[1].length)) {
  regels.push(`| ${s} | ${lijst.length} |`);
}

for (const [s, lijst] of [...perSignaal.entries()].sort((a, b) => b[1].length - a[1].length)) {
  regels.push(`\n### ${s} (${lijst.length})\n`);
  for (const v of lijst.sort((a, b) => a.titel.localeCompare(b.titel))) {
    const extra = s.startsWith('afbeeldingen definitief kwijt')
      ? ` — ${v.telling.dood} stuks`
      : s.startsWith('afbeeldingen overgezet')
        ? ` — ${v.telling.gered} stuks`
        : '';
    regels.push(`- ${v.titel} — _${v.categorieNaam ?? 'geen categorie'}_${extra}`);
  }
}

const tot = verwerkt.reduce(
  (s, v) => ({
    icoon: s.icoon + v.telling.icoon,
    gered: s.gered + v.telling.gered,
    dood: s.dood + v.telling.dood,
    extern: s.extern + v.telling.extern,
  }),
  { icoon: 0, gered: 0, dood: 0, extern: 0 },
);
regels.push('\n## Afbeeldingen\n');
regels.push('| | Aantal |');
regels.push('|---|---:|');
regels.push(`| Opmaakiconen van de Zoho-editor, weggelaten | ${tot.icoon} |`);
regels.push(`| Overgezet naar eigen opslag | ${tot.gered} |`);
regels.push(`| Definitief kwijt (Freshdesk-resten) | ${tot.dood} |`);
regels.push(`| Externe links, ongewijzigd gelaten | ${tot.extern} |`);

regels.push('\n## Verdeling over de nieuwe categorieën\n');
const perCat = new Map();
for (const v of verwerkt) perCat.set(v.categorieNaam, (perCat.get(v.categorieNaam) ?? 0) + 1);
regels.push('| Categorie | Artikelen |');
regels.push('|---|---:|');
for (const [c, n] of [...perCat.entries()].sort((a, b) => b[1] - a[1])) {
  regels.push(`| ${c ?? 'GEEN'} | ${n} |`);
}

if (zonderMapping.length > 0) {
  regels.push('\n## Zonder mappingregel\n');
  regels.push('Deze artikelen stonden niet in de mapping-CSV en kregen geen categorie:\n');
  for (const t of zonderMapping) regels.push(`- ${t}`);
}

writeFileSync('import/reviewrapport.md', regels.join('\n'), 'utf8');

// --- Tokenomvang meten ------------------------------------------------------

const artikelblok = verwerkt.map((v) => `# ${v.titel}\n\n${v.markdown}`).join('\n\n---\n\n');
const geschatteTokens = Math.round(artikelblok.length / 3.5);

console.log('Omvang van het artikelblok (alles, ook wat straks draft blijft)');
console.log(`  ${artikelblok.length.toLocaleString('nl-NL')} tekens Markdown`);
console.log(`  ruwweg ${geschatteTokens.toLocaleString('nl-NL')} tokens geschat`);
console.log('  (exacte meting volgt met de token-teller van de Anthropic API)\n');

// --- Wegschrijven naar de database ------------------------------------------

if (DROOGLOOP) {
  console.log('Droogloop: er is niets naar de database geschreven.');
  console.log('Reviewrapport staat in import/reviewrapport.md\n');
  process.exit(0);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: categorieen } = await supabase.from('categories').select('id, name');
const catOpNaam = new Map(categorieen.map((c) => [c.name, c.id]));

const { data: bestaandeTags } = await supabase.from('tags').select('id, name');
const tagOpNaam = new Map(bestaandeTags.map((t) => [t.name, t.id]));

const { data: bestaand } = await supabase
  .from('articles')
  .select('id, source_article_id, source_checksum, status');
const bestaandOpBron = new Map(bestaand.filter((a) => a.source_article_id).map((a) => [a.source_article_id, a]));

let nieuw = 0;
let bijgewerkt = 0;
let overgeslagen = 0;
const conflicten = [];

for (const v of verwerkt) {
  const huidig = bestaandOpBron.get(v.zohoId);

  if (huidig && huidig.source_checksum === v.checksum) {
    overgeslagen += 1;
    continue;
  }
  if (huidig && huidig.status !== 'draft') {
    // Niet overschrijven wat al beoordeeld en gepubliceerd is.
    conflicten.push(v.titel);
    continue;
  }

  const rij = {
    slug: v.slug,
    title: v.titel,
    summary: v.samenvatting,
    content_markdown: v.markdown,
    status: 'draft',
    category_id: v.categorieNaam ? (catOpNaam.get(v.categorieNaam) ?? null) : null,
    source: 'zoho-import',
    source_article_id: v.zohoId,
    source_checksum: v.checksum,
  };

  // Geen upsert: de unieke index op source_article_id is een partiële index,
  // waar PostgreSQL's on conflict niet op kan inferren. Expliciet dus.
  const { data: opgeslagen, error } = huidig
    ? await supabase.from('articles').update(rij).eq('id', huidig.id).select('id').single()
    : await supabase.from('articles').insert(rij).select('id').single();

  if (error) {
    console.error(`  FOUT bij "${v.titel}": ${error.message}`);
    continue;
  }

  if (huidig) bijgewerkt += 1;
  else nieuw += 1;

  // Tags koppelen.
  if (v.tags.length > 0) {
    const tagIds = [];
    for (const naam of v.tags) {
      let id = tagOpNaam.get(naam);
      if (!id) {
        const { data: nieuweTag } = await supabase
          .from('tags')
          .upsert({ name: naam }, { onConflict: 'name' })
          .select('id')
          .single();
        id = nieuweTag?.id;
        if (id) tagOpNaam.set(naam, id);
      }
      if (id) tagIds.push(id);
    }
    await supabase.from('article_tags').delete().eq('article_id', opgeslagen.id);
    if (tagIds.length > 0) {
      await supabase
        .from('article_tags')
        .insert(tagIds.map((tag_id) => ({ article_id: opgeslagen.id, tag_id })));
    }
  }

  process.stdout.write(`\r  ${nieuw + bijgewerkt} weggeschreven`);
}
console.log('');

console.log(`\nKlaar.`);
console.log(`  ${nieuw} nieuw`);
console.log(`  ${bijgewerkt} bijgewerkt`);
console.log(`  ${overgeslagen} ongewijzigd, overgeslagen`);
if (conflicten.length > 0) {
  console.log(`  ${conflicten.length} niet aangeraakt omdat ze niet meer op draft staan:`);
  for (const t of conflicten) console.log(`      ${t}`);
}
console.log('\nReviewrapport: import/reviewrapport.md\n');
