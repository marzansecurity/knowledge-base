'use server';

import { revalidatePath } from 'next/cache';
import { vereisBeheerder } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/lib/types';

const GELDIGE_ROLLEN: UserRole[] = ['reader', 'editor', 'admin'];

export type UitnodigenResultaat = { fout?: string; succes?: string };

/**
 * Nodigt een nieuwe medewerker uit per e-mail. Supabase maakt het account aan en
 * stuurt een uitnodigingsmail; de database-trigger handle_new_user() maakt
 * automatisch een profiel als "reader" aan, dat we hierna naar de gekozen rol zetten.
 */
export async function nodigGebruikerUit(formData: FormData): Promise<UitnodigenResultaat> {
  await vereisBeheerder();

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const displayName = String(formData.get('display_name') ?? '').trim();
  const role = String(formData.get('role') ?? 'reader') as UserRole;

  if (!email) return { fout: 'Een e-mailadres is verplicht.' };
  if (!displayName) return { fout: 'Een naam is verplicht.' };
  if (!GELDIGE_ROLLEN.includes(role)) return { fout: 'Onbekende rol.' };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { display_name: displayName },
  });
  if (error) return { fout: error.message };

  if (role !== 'reader' && data.user) {
    const { error: rolFout } = await admin
      .from('profiles')
      .update({ role })
      .eq('user_id', data.user.id);
    if (rolFout) return { fout: `Uitnodiging verstuurd, maar rol instellen mislukte: ${rolFout.message}` };
  }

  revalidatePath('/beheer/gebruikers');
  return { succes: `Uitnodiging verstuurd naar ${email}.` };
}

/** Slaat rol, actief-status en kennis-toegang van één medewerker in één keer op. */
export async function bewaarGebruiker(profileId: string, formData: FormData): Promise<void> {
  const { supabase, user } = await vereisBeheerder();

  const role = String(formData.get('role') ?? '') as UserRole;
  const active = formData.get('active') === 'on';
  const categoryIds = formData.getAll('category_ids').map(String).filter(Boolean);

  if (!GELDIGE_ROLLEN.includes(role)) throw new Error('Onbekende rol.');
  if (profileId === user.id && (role !== 'admin' || !active)) {
    throw new Error('Je kunt je eigen rol niet verlagen of jezelf deactiveren.');
  }

  const { error: profielFout } = await supabase
    .from('profiles')
    .update({ role, active })
    .eq('user_id', profileId);
  if (profielFout) throw new Error(profielFout.message);

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
