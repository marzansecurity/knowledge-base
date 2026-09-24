/**
 * Zet de leveranciers uit import/leveranciers.json in het leveranciersoverzicht.
 *
 * Veilig om opnieuw te draaien:
 *   - een leverancier die nog niet bestaat (op slug) wordt toegevoegd;
 *   - bij een bestaande leverancier worden alléén lege velden aangevuld. Wat in
 *     de app al is ingevuld of aangepast, blijft staan.
 *
 *   node --env-file=.env.local scripts/importeer-leveranciers.mjs [--droogloop]
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DROOGLOOP = process.argv.includes('--droogloop');
const STATUSSEN = ['auto', 'half', 'manual', 'nvt'];
const LANDEN = ['NL', 'BE', 'UK'];
const TYPES = ['fulfilment', 'dropshipment', 'installateur'];
const STATUSVELDEN = ['purchase_order_status', 'order_confirmation_status', 'tracking_status', 'stock_sync_status'];
const AANVULBAAR = [...STATUSVELDEN, 'stock_sync_frequency', 'carrier', 'notes', 'details_markdown'];
const LIJSTEN = ['countries', 'types', 'related_article_slugs'];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const leveranciers = JSON.parse(
  await readFile(path.join(process.cwd(), 'import', 'leveranciers.json'), 'utf8'),
);

// Eerst alles controleren; bij één fout wordt er niets weggeschreven.
for (const l of leveranciers) {
  const fout = (m) => {
    throw new Error(`${l.name ?? '(zonder naam)'}: ${m}`);
  };
  if (!l.name || !l.slug) fout('name en slug zijn verplicht');
  if (!/^[a-z0-9-]+$/.test(l.slug)) fout(`ongeldige slug "${l.slug}"`);
  for (const veld of STATUSVELDEN) {
    if (l[veld] != null && !STATUSSEN.includes(l[veld])) fout(`${veld} moet ${STATUSSEN.join('/')} of null zijn`);
  }
  for (const c of l.countries ?? []) if (!LANDEN.includes(c)) fout(`onbekend land "${c}"`);
  for (const t of l.types ?? []) if (!TYPES.includes(t)) fout(`onbekend type "${t}"`);
}

const { data: bestaand, error } = await supabase.from('suppliers').select('*');
if (error) throw error;
const perSlug = new Map(bestaand.map((s) => [s.slug, s]));

let nieuw = 0;
let aangevuld = 0;
let ongewijzigd = 0;

for (const l of leveranciers) {
  const huidig = perSlug.get(l.slug);

  if (!huidig) {
    console.log(`  nieuw       ${l.slug}`);
    nieuw += 1;
    if (DROOGLOOP) continue;
    const rij = { name: l.name, slug: l.slug };
    for (const veld of [...AANVULBAAR, ...LIJSTEN]) if (l[veld] != null) rij[veld] = l[veld];
    const { error: fout } = await supabase.from('suppliers').insert(rij);
    if (fout) throw fout;
    continue;
  }

  const wijziging = {};
  for (const veld of AANVULBAAR) {
    if ((huidig[veld] == null || huidig[veld] === '') && l[veld] != null) wijziging[veld] = l[veld];
  }
  for (const veld of LIJSTEN) {
    if ((huidig[veld] ?? []).length === 0 && (l[veld] ?? []).length > 0) wijziging[veld] = l[veld];
  }

  const velden = Object.keys(wijziging);
  if (velden.length === 0) {
    console.log(`  ongewijzigd ${l.slug}`);
    ongewijzigd += 1;
    continue;
  }
  console.log(`  aanvullen   ${l.slug}: ${velden.join(', ')}`);
  aangevuld += 1;
  if (DROOGLOOP) continue;
  const { error: fout } = await supabase.from('suppliers').update(wijziging).eq('id', huidig.id);
  if (fout) throw fout;
}

console.log(
  `\n${DROOGLOOP ? 'Droogloop: ' : ''}${nieuw} nieuw, ${aangevuld} aangevuld, ${ongewijzigd} ongewijzigd.` +
    (DROOGLOOP ? ' Niets weggeschreven.' : '') +
    '\n',
);
