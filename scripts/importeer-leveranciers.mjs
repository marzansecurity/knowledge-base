/**
 * Zet de leveranciers uit import/leveranciers.json in het leveranciersoverzicht,
 * inclusief hun regio's (nlbe = Nederland & België, uk = Verenigd Koninkrijk).
 *
 * Standaard veilig om opnieuw te draaien:
 *   - een leverancier of regio die nog niet bestaat (op slug) wordt toegevoegd;
 *   - bij wat al bestaat worden alléén lege velden aangevuld. Wat in de app al
 *     is ingevuld of aangepast, blijft staan.
 *
 * Met --overschrijf worden bestaande velden wél vervangen door wat in het
 * bestand staat. Draai dan altijd eerst met --droogloop: die toont per veld
 * de oude en de nieuwe waarde.
 *
 *   node --env-file=.env.local scripts/importeer-leveranciers.mjs [--droogloop] [--overschrijf]
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DROOGLOOP = process.argv.includes('--droogloop');
const OVERSCHRIJF = process.argv.includes('--overschrijf');

const STATUSSEN = ['auto', 'half', 'manual', 'nvt'];
const REGIOS = ['nlbe', 'uk'];
const TYPES = ['fulfilment', 'dropshipment', 'installateur'];
const STATUSVELDEN = ['stock_sync_status', 'purchase_order_status', 'order_confirmation_status', 'tracking_status'];

const LEVERANCIER_TEKST = ['name', 'based_in', 'details_markdown'];
const LEVERANCIER_LIJST = ['related_article_slugs'];
const REGIO_TEKST = [...STATUSVELDEN, 'stock_sync_frequency', 'carrier', 'notes'];
const REGIO_LIJST = ['types'];

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
  if (l.based_in != null && !/^[A-Z]{2}$/.test(l.based_in)) fout(`based_in moet een landcode zijn, bv. DE`);
  for (const [regio, r] of Object.entries(l.regions ?? {})) {
    if (!REGIOS.includes(regio)) fout(`onbekende regio "${regio}" (${REGIOS.join('/')})`);
    for (const veld of STATUSVELDEN) {
      if (r[veld] != null && !STATUSSEN.includes(r[veld])) fout(`${regio}.${veld} moet ${STATUSSEN.join('/')} of null zijn`);
    }
    for (const t of r.types ?? []) if (!TYPES.includes(t)) fout(`${regio}: onbekend type "${t}"`);
  }
}

const leeg = (w) => w == null || w === '' || (Array.isArray(w) && w.length === 0);
const gelijk = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const toon = (w) => (w == null ? '∅' : JSON.stringify(w).slice(0, 70));

/** Welke velden er veranderen: alleen lege aanvullen, of met --overschrijf alles wat afwijkt. */
function wijzigingen(huidig, gewenst, velden) {
  const w = {};
  for (const veld of velden) {
    if (!(veld in gewenst) || leeg(gewenst[veld])) continue;
    if (gelijk(huidig[veld], gewenst[veld])) continue;
    if (OVERSCHRIJF || leeg(huidig[veld])) w[veld] = gewenst[veld];
  }
  return w;
}

function meld(label, huidig, w) {
  const velden = Object.keys(w);
  if (velden.length === 0) return;
  console.log(`  ${label}`);
  for (const v of velden) console.log(`      ${v}: ${toon(huidig?.[v])} → ${toon(w[v])}`);
}

const { data: bestaand, error } = await supabase.from('suppliers').select('*, supplier_regions(*)');
if (error) throw error;
const perSlug = new Map(bestaand.map((s) => [s.slug, s]));

let teller = { nieuw: 0, gewijzigd: 0, ongewijzigd: 0 };

for (const l of leveranciers) {
  let huidig = perSlug.get(l.slug);
  let veranderd = false;

  if (!huidig) {
    console.log(`  nieuw        ${l.slug}`);
    teller.nieuw += 1;
    veranderd = true;
    if (!DROOGLOOP) {
      const rij = { name: l.name, slug: l.slug, own_stock: Boolean(l.own_stock) };
      for (const v of [...LEVERANCIER_TEKST, ...LEVERANCIER_LIJST]) if (!leeg(l[v])) rij[v] = l[v];
      const { data, error: fout } = await supabase.from('suppliers').insert(rij).select('*').single();
      if (fout) throw fout;
      huidig = { ...data, supplier_regions: [] };
    } else {
      huidig = { supplier_regions: [] };
    }
  } else {
    const w = wijzigingen(huidig, l, [...LEVERANCIER_TEKST, ...LEVERANCIER_LIJST]);
    // Eigen voorraad alleen aanzetten; uitzetten doe je in de app.
    if (l.own_stock && !huidig.own_stock) w.own_stock = true;
    if (Object.keys(w).length) {
      meld(`wijzigen     ${l.slug}`, huidig, w);
      veranderd = true;
      if (!DROOGLOOP) {
        const { error: fout } = await supabase.from('suppliers').update(w).eq('id', huidig.id);
        if (fout) throw fout;
      }
    }
  }

  for (const [regio, r] of Object.entries(l.regions ?? {})) {
    const huidigeRegio = (huidig.supplier_regions ?? []).find((x) => x.region === regio);
    if (!huidigeRegio) {
      console.log(`  nieuwe regio ${l.slug} / ${regio}`);
      veranderd = true;
      if (!DROOGLOOP) {
        const rij = { supplier_id: huidig.id, region: regio };
        for (const v of [...REGIO_TEKST, ...REGIO_LIJST]) if (!leeg(r[v])) rij[v] = r[v];
        const { error: fout } = await supabase.from('supplier_regions').insert(rij);
        if (fout) throw fout;
      }
      continue;
    }
    const w = wijzigingen(huidigeRegio, r, [...REGIO_TEKST, ...REGIO_LIJST]);
    if (Object.keys(w).length) {
      meld(`wijzigen     ${l.slug} / ${regio}`, huidigeRegio, w);
      veranderd = true;
      if (!DROOGLOOP) {
        const { error: fout } = await supabase.from('supplier_regions').update(w).eq('id', huidigeRegio.id);
        if (fout) throw fout;
      }
    }
  }

  if (!veranderd) {
    console.log(`  ongewijzigd  ${l.slug}`);
    teller.ongewijzigd += 1;
  } else if (perSlug.has(l.slug)) {
    teller.gewijzigd += 1;
  }
}

console.log(
  `\n${DROOGLOOP ? 'Droogloop: ' : ''}${teller.nieuw} nieuw, ${teller.gewijzigd} gewijzigd, ${teller.ongewijzigd} ongewijzigd.` +
    (OVERSCHRIJF ? ' (overschrijven aan)' : ' (alleen lege velden aangevuld)') +
    (DROOGLOOP ? ' Niets weggeschreven.' : '') +
    '\n',
);
