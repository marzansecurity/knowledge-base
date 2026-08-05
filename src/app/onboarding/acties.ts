'use server';

import { revalidatePath } from 'next/cache';
import { vereisIngelogd } from '@/lib/auth';

/** Zet een artikel op de onboarding-checklist aan of uit voor de ingelogde medewerker. */
export async function zetGelezenStatus(articleId: string, gelezen: boolean): Promise<void> {
  const { supabase, user } = await vereisIngelogd();

  if (gelezen) {
    const { error } = await supabase
      .from('article_reads')
      .upsert({ profile_id: user.id, article_id: articleId }, { onConflict: 'profile_id,article_id' });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('article_reads')
      .delete()
      .eq('profile_id', user.id)
      .eq('article_id', articleId);
    if (error) throw new Error(error.message);
  }

  revalidatePath('/onboarding');
}
