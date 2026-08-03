/**
 * Haalt de afbeeldingen op die alleen met een Zoho-login bereikbaar zijn en zet
 * ze in een private Supabase Storage-bucket. Legt vast welke oude URL bij welk
 * nieuw pad hoort, zodat het importscript de verwijzingen kan omschrijven.
 *
 *   node --env-file=.env.local scripts/afbeeldingen-ophalen.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'artikel-afbeeldingen';
const RUW = 'import/zoho-ruw';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// --- Bucket klaarzetten -----------------------------------------------------

const { data: buckets } = await supabase.storage.listBuckets();
if (!buckets.some((b) => b.name === BUCKET)) {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: '10MB',
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
  });
  if (error) throw error;
  console.log(`bucket ${BUCKET} aangemaakt (private)`);
} else {
  console.log(`bucket ${BUCKET} bestaat al`);
}

// --- Zoho-token -------------------------------------------------------------

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
const { access_token } = await r.json();
if (!access_token) throw new Error('Geen Zoho access token gekregen.');

// --- Verzamelen welke afbeeldingen bij welk artikel horen -------------------

const teHalen = [];
for (const bestand of readdirSync(RUW).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
  const a = JSON.parse(readFileSync(`${RUW}/${bestand}`, 'utf8'));
  let n = 0;
  for (const m of (a.answer ?? '').matchAll(/<img[^>]+src="([^"]+)"/gi)) {
    const url = m[1];
    if (!url.includes('desk.zoho.eu')) continue;
    n += 1;
    teHalen.push({ artikelId: a.id, url, volgnummer: n });
  }
}

console.log(`${teHalen.length} afbeeldingen op te halen uit Zoho\n`);

// --- Downloaden en uploaden -------------------------------------------------

const extensies = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const map = {};
let gelukt = 0;
const mislukt = [];

for (const { artikelId, url, volgnummer } of teHalen) {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${access_token}`, orgId: process.env.ZOHO_ORG_ID },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim();
    const ext = extensies[type] ?? 'png';
    const pad = `zoho/${artikelId}/${String(volgnummer).padStart(2, '0')}.${ext}`;
    const bytes = Buffer.from(await res.arrayBuffer());

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(pad, bytes, { contentType: type || 'image/png', upsert: true });
    if (error) throw error;

    map[url] = pad;
    gelukt += 1;
    process.stdout.write(`\r  ${gelukt}/${teHalen.length} opgeslagen`);
  } catch (e) {
    mislukt.push({ url, reden: e.message });
  }
  await new Promise((r) => setTimeout(r, 100));
}
console.log('');

writeFileSync('import/afbeeldingen-map.json', JSON.stringify(map, null, 2), 'utf8');

console.log(`\n${gelukt} afbeeldingen in bucket ${BUCKET}`);
if (mislukt.length > 0) {
  console.log(`${mislukt.length} mislukt:`);
  for (const m of mislukt) console.log(`   ${m.reden}  ${m.url.slice(0, 80)}…`);
}
console.log('\nVerwijzingen vastgelegd in import/afbeeldingen-map.json\n');
