import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Welke topcategorieën een medewerker mag zien in de AI-context en onboarding.
 * Geen rijen geconfigureerd → null, wat "onbeperkt" betekent. Roep dit nooit aan
 * voor een admin — admins zijn altijd onbeperkt, ongeacht configuratie.
 */
export async function haalToegankelijkeCategorieIds(
  supabase: SupabaseClient,
  profileId: string,
): Promise<Set<string> | null> {
  const { data, error } = await supabase
    .from('profile_categories')
    .select('category_id')
    .eq('profile_id', profileId);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return new Set(data.map((r) => r.category_id as string));
}

/** Voor de beheerpagina: toegang van alle medewerkers in één keer, per profile_id. */
export async function haalAlleCategorieToegang(
  supabase: SupabaseClient,
): Promise<Map<string, Set<string>>> {
  const { data, error } = await supabase.from('profile_categories').select('profile_id, category_id');
  if (error) throw error;

  const per = new Map<string, Set<string>>();
  for (const r of data ?? []) {
    const set = per.get(r.profile_id) ?? new Set<string>();
    set.add(r.category_id);
    per.set(r.profile_id, set);
  }
  return per;
}
