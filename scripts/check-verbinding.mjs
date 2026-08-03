/**
 * Controleert of de omgevingsvariabelen kloppen: Supabase-verbinding,
 * het schema, de gebruikersprofielen en de Anthropic-sleutel.
 *
 *   node --env-file=.env.local scripts/check-verbinding.mjs
 */
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const ok = (m) => console.log(`  ok    ${m}`);
const fout = (m) => console.log(`  FOUT  ${m}`);

let alles = true;

console.log('\nSupabase');
try {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const { count, error } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true });
  if (error) throw error;
  ok(`verbinding en schema in orde (${count} categorieën)`);

  const { data: profielen, error: profielFout } = await supabase
    .from('profiles')
    .select('display_name, role, active');
  if (profielFout) throw profielFout;

  if (profielen.length === 0) {
    fout('geen gebruikers gevonden — maak een gebruiker aan onder Authentication → Users');
    alles = false;
  } else {
    for (const p of profielen) {
      const rol = p.role === 'admin' ? 'beheerder' : 'medewerker';
      ok(`gebruiker ${p.display_name} — ${rol}${p.active ? '' : ' (inactief)'}`);
    }
    if (!profielen.some((p) => p.role === 'admin')) {
      fout('nog geen beheerder — draai de update-query uit de instructies');
      alles = false;
    }
  }
} catch (e) {
  fout(`Supabase: ${e.message}`);
  alles = false;
}

console.log('\nAnthropic');
try {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL;
  const antwoord = await anthropic.messages.create({
    model,
    max_tokens: 16,
    messages: [{ role: 'user', content: 'Antwoord met exact het woord: goed' }],
  });
  const tekst = antwoord.content.find((b) => b.type === 'text')?.text.trim();
  ok(`${model} bereikbaar (antwoord: "${tekst}")`);
} catch (e) {
  fout(`Anthropic: ${e.message}`);
  alles = false;
}

console.log(alles ? '\nAlles in orde.\n' : '\nEr zijn punten die aandacht nodig hebben.\n');
process.exit(alles ? 0 : 1);
