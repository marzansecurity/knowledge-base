/**
 * Haalt alle Zoho Desk-artikelen op inclusief volledige inhoud en schrijft de
 * ruwe JSON onaangeroerd weg. Deze stap wijzigt niets in de database.
 *
 *   node --env-file=.env.local scripts/zoho-ophalen.mjs
 *
 * Resultaat: import/zoho-ruw/<artikel-id>.json per artikel, plus _index.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const BASIS = 'https://desk.zoho.eu/api/v1';
const ORG = process.env.ZOHO_ORG_ID;
const MAP = 'import/zoho-ruw';

for (const naam of ['ZOHO_ORG_ID', 'ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN']) {
  if (!process.env[naam]) {
    console.error(`${naam} ontbreekt in .env.local. Zie het stappenplan in import/LEESMIJ.md.`);
    process.exit(1);
  }
}

async function accessToken() {
  const r = await fetch('https://accounts.zoho.eu/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    }),
  });
  const data = await r.json();
  if (!data.access_token) {
    throw new Error(`Geen access token van Zoho: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

const token = await accessToken();
const headers = { Authorization: `Zoho-oauthtoken ${token}`, orgId: ORG };

async function haal(pad) {
  const r = await fetch(`${BASIS}${pad}`, { headers });
  if (r.status === 204) return null;
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} bij ${pad}: ${await r.text()}`);
  return r.json();
}

// --- 1. Alle artikelen inventariseren (50 per pagina) ------------------------

const lijst = [];
for (let van = 1; ; van += 50) {
  const pagina = await haal(`/articles?limit=50&from=${van}&sortBy=-modifiedTime`);
  const rijen = pagina?.data ?? [];
  if (rijen.length === 0) break;
  lijst.push(...rijen);
  process.stdout.write(`\r  ${lijst.length} artikelen gevonden`);
  if (rijen.length < 50) break;
}
console.log('');

// --- 2. Categorieboom meenemen ----------------------------------------------

const categorieen = await haal('/kbRootCategories?limit=100');

// --- 3. Per artikel de volledige inhoud ophalen ------------------------------

mkdirSync(MAP, { recursive: true });

const index = [];
let n = 0;
for (const kort of lijst) {
  const vol = await haal(`/articles/${kort.id}`);
  writeFileSync(`${MAP}/${kort.id}.json`, JSON.stringify(vol, null, 2), 'utf8');
  index.push({
    id: vol.id,
    title: vol.title,
    status: vol.status,
    permalink: vol.permalink,
    categorie: vol.category?.name ?? null,
    modifiedTime: vol.modifiedTime,
    tekens: (vol.answer ?? '').length,
  });
  n += 1;
  process.stdout.write(`\r  ${n}/${lijst.length} opgehaald`);
  // Zoho hanteert een limiet per minuut; rustig aan doen.
  await new Promise((r) => setTimeout(r, 120));
}
console.log('');

writeFileSync(
  `${MAP}/_index.json`,
  JSON.stringify({ opgehaald: new Date().toISOString(), aantal: index.length, artikelen: index }, null, 2),
  'utf8',
);
writeFileSync(`${MAP}/_categorieen.json`, JSON.stringify(categorieen, null, 2), 'utf8');

const leeg = index.filter((a) => a.tekens < 200).length;
const totaalTekens = index.reduce((s, a) => s + a.tekens, 0);

console.log(`\nKlaar. ${index.length} artikelen weggeschreven naar ${MAP}/`);
console.log(`  ${totaalTekens.toLocaleString('nl-NL')} tekens HTML in totaal`);
console.log(`  ${leeg} artikelen met minder dan 200 tekens inhoud`);
console.log('\nVolgende stap: node --env-file=.env.local scripts/importeer.mjs --droogloop\n');
