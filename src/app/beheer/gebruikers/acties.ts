'use server';

import { revalidatePath } from 'next/cache';
import { vereisBeheerder } from '@/lib/auth';

/**
 * Slaat de kennis-toegang van één medewerker op (vervangt de volledige set).
 * Geen categorieën aangevinkt betekent onbeperkte toegang — zie toegang.ts.
 */
export async function bewaarToegang(profileId: string, formData: FormData): Promise<void> {
  const { supabase } = await vereisBeheerder();

  const categoryIds = formData.getAll('category_ids').map(String).filter(Boolean);

  const { error: verwijderFout } = await supabase
    .from('profile_categories')
    .delete()
    .eq('profile_id', profileId);
  if (verwijderFout) throw new Error(verwijderFout.message);

  if (categoryIds.length > 0) {
    const { error: invoegFout } = await supabase
      .from('profile_categories')
      .insert(categoryIds.map((categoryId) => ({ profile_id: profileId, category_id: categoryId })));
    if (invoegFout) throw new Error(invoegFout.message);
  }

  revalidatePath('/beheer/gebruikers');
}
