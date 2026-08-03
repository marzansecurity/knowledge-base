import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Haalt de ingelogde gebruiker en zijn profiel op, of stuurt door naar login. */
export async function vereisIngelogd() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profiel } = await supabase
    .from('profiles')
    .select('user_id, display_name, role, active')
    .eq('user_id', user.id)
    .single();

  return { supabase, user, profiel };
}

/** Zoals vereisIngelogd, maar stuurt niet-beheerders naar de startpagina. */
export async function vereisBeheerder() {
  const context = await vereisIngelogd();
  if (context.profiel?.role !== 'admin') redirect('/');
  return context;
}
