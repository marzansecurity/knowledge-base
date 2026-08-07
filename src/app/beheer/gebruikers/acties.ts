'use server';

import { revalidatePath } from 'next/cache';
import { vereisBeheerder } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/lib/types';

const GELDIGE_ROLLEN: UserRole[] = ['reader', 'editor', 'admin'];

export type AanmakenResultaat = { fout?: string; succes?: string };

/**
 * Maakt direct een account aan met een tijdelijk wachtwoord dat de beheerder zelf
 * kiest en veilig doorgeeft aan de medewerker (bv. mondeling of via een beveiligd
 * kanaal). Geen e-mail nodig — handig voor adressen die nog niet echt bestaan of
 * niet door de medewerker zelf worden gecheckt. De medewerker kan het wachtwoord
 * na de eerste keer inloggen zelf wijzigen op /account.
 */
export async function maakGebruikerAan(formData: FormData): Promise<AanmakenResultaat> {
  await vereisBeheerder();

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const displayName = String(formData.get('display_name') ?? '').trim();
  const role = String(formData.get('role') ?? 'reader') as UserRole;
  const wachtwoord = String(formData.get('password') ?? '');

  if (!email) return { fout: 'Een e-mailadres is verplicht.' };
  if (!displayName) return { fout: 'Een naam is verplicht.' };
  if (!GELDIGE_ROLLEN.includes(role)) return { fout: 'Onbekende rol.' };
  if (wachtwoord.length < 8) return { fout: 'Het tijdelijke wachtwoord moet minstens 8 tekens zijn.' };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: wachtwoord,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error) return { fout: error.message };

  if (role !== 'reader' && data.user) {
    const { error: rolFout } = await admin
      .from('profiles')
      .update({ role })
      .eq('user_id', data.user.id);
    if (rolFout) return { fout: `Account aangemaakt, maar rol instellen mislukte: ${rolFout.message}` };
  }

  revalidatePath('/beheer/gebruikers');
  return { succes: `Account aangemaakt voor ${email}. Geef het tijdelijke wachtwoord veilig door.` };
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
