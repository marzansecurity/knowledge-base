/**
 * Voegt de tiende categorie en de leerlijn-tag toe. Idempotent.
 *
 *   node --env-file=.env.local scripts/seed-extra.mjs
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { error: catFout } = await supabase
  .from('categories')
  .upsert(
    { name: 'Verkoop & Productadvies', slug: 'verkoop-productadvies', sort_order: 10 },
    { onConflict: 'slug' },
  );
if (catFout) throw catFout;
console.log('ok  categorie Verkoop & Productadvies');

const { error: tagFout } = await supabase
  .from('tags')
  .upsert({ name: 'start-hier' }, { onConflict: 'name' });
if (tagFout) throw tagFout;
console.log('ok  tag start-hier');

const { data: categorieen } = await supabase
  .from('categories')
  .select('name')
  .order('sort_order');
const { count: aantalTags } = await supabase
  .from('tags')
  .select('id', { count: 'exact', head: true });

console.log(`\n${categorieen.length} categorieën, ${aantalTags} tags:`);
for (const c of categorieen) console.log(`  ${c.name}`);
