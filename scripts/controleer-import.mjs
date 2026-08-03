/**
 * Controleert wat er na de import daadwerkelijk in de database staat.
 *
 *   node --env-file=.env.local scripts/controleer-import.mjs
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: artikelen } = await supabase
  .from('articles')
  .select('id, title, status, source, category_id, content_markdown, categories(name)')
  .limit(500);

console.log(`\n${artikelen.length} artikelen in de database`);

const perStatus = new Map();
for (const a of artikelen) perStatus.set(a.status, (perStatus.get(a.status) ?? 0) + 1);
console.log('\nStatus');
for (const [s, n] of perStatus) console.log(`  ${String(n).padStart(3)}  ${s}`);

const perCat = new Map();
for (const a of artikelen) {
  const naam = a.categories?.name ?? 'GEEN CATEGORIE';
  perCat.set(naam, (perCat.get(naam) ?? 0) + 1);
}
console.log('\nCategorie');
for (const [c, n] of [...perCat.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${c}`);
}

const { count: koppelingen } = await supabase
  .from('article_tags')
  .select('article_id', { count: 'exact', head: true });
console.log(`\n${koppelingen} tagkoppelingen`);

const { data: tags } = await supabase.from('tags').select('name, article_tags(article_id)');
console.log('\nTags met artikelen');
for (const t of tags.sort((a, b) => b.article_tags.length - a.article_tags.length)) {
  if (t.article_tags.length > 0) {
    console.log(`  ${String(t.article_tags.length).padStart(3)}  ${t.name}`);
  }
}

const zonderInhoud = artikelen.filter((a) => (a.content_markdown ?? '').length < 50);
console.log(`\n${zonderInhoud.length} artikelen met minder dan 50 tekens inhoud`);

// Zoektest: werkt de Nederlandse full-text index?
const { data: treffers } = await supabase
  .from('articles')
  .select('title')
  .textSearch('search_vector', 'orderbevestiging', { config: 'dutch' })
  .limit(5);
console.log(`\nZoektest op "orderbevestiging": ${treffers?.length ?? 0} treffers`);
for (const t of treffers ?? []) console.log(`  ${t.title}`);

// Tikfouttest via trigram.
const { data: tikfout } = await supabase
  .from('articles')
  .select('title')
  .ilike('content_markdown', '%logicol%')
  .limit(3);
console.log(`\nArtikelen die LogiCol noemen: ${tikfout?.length ?? 0}`);
for (const t of tikfout ?? []) console.log(`  ${t.title}`);
console.log('');
