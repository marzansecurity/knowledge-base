import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { huidigeTaal } from '@/lib/taal-server';
import { pad } from '@/lib/paden';

/** Haalt de ingelogde gebruiker en zijn profiel op, of stuurt door naar login. */
export async function vereisIngelogd() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // De taal komt uit de cookie die de proxy zet; zo werkt dit ook in server
  // actions, die geen route-params hebben.
  if (!user) redirect(pad(await huidigeTaal(), '/login'));

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
  if (context.profiel?.role !== 'admin') redirect(pad(await huidigeTaal()));
  return context;
}

/** Zoals vereisIngelogd, maar stuurt medewerkers (zonder redacteur/beheerder-rol) naar de startpagina. */
export async function vereisRedacteurOfHoger() {
  const context = await vereisIngelogd();
  if (context.profiel?.role !== 'admin' && context.profiel?.role !== 'editor') {
    redirect(pad(await huidigeTaal()));
  }
  return context;
}
