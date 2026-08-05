'use server';

import { revalidatePath } from 'next/cache';
import { vereisBeheerder } from '@/lib/auth';

/** Markeert een geëscaleerde vraag als afgehandeld, met optionele notitie (bv. link naar het nieuwe artikel). */
export async function markeerAfgehandeld(messageId: string, formData: FormData): Promise<void> {
  const { supabase, user } = await vereisBeheerder();

  const notitie = String(formData.get('resolution_note') ?? '').trim() || null;

  const { error } = await supabase
    .from('messages')
    .update({ resolved_at: new Date().toISOString(), resolved_by: user.id, resolution_note: notitie })
    .eq('id', messageId);
  if (error) throw new Error(error.message);

  revalidatePath('/beheer/escalaties');
  revalidatePath('/beheer');
}

/** Zet een afgehandelde escalatie terug naar open, voor het geval iets per ongeluk werd afgevinkt. */
export async function heropenEscalatie(messageId: string): Promise<void> {
  const { supabase } = await vereisBeheerder();

  const { error } = await supabase
    .from('messages')
    .update({ resolved_at: null, resolved_by: null, resolution_note: null })
    .eq('id', messageId);
  if (error) throw new Error(error.message);

  revalidatePath('/beheer/escalaties');
  revalidatePath('/beheer');
}
