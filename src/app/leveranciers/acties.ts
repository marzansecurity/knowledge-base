'use server';

import { revalidatePath } from 'next/cache';
import { vereisRedacteurOfHoger } from '@/lib/auth';
import { COUNTRIES, SUPPLIER_TYPES } from '@/lib/types';

function leesVeldenUit(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const countries = COUNTRIES.filter((c) => formData.get(`country_${c}`) === 'on');
  const types = SUPPLIER_TYPES.filter((t) => formData.get(`type_${t}`) === 'on');
  const carrier = String(formData.get('carrier') ?? '').trim() || null;
  const trackingAvailable = formData.get('tracking_available') === 'on';
  const trackingAutomatic = formData.get('tracking_automatic') === 'on';
  const notes = String(formData.get('notes') ?? '').trim() || null;
  return { name, countries, types, carrier, trackingAvailable, trackingAutomatic, notes };
}

/** Voegt een nieuwe leverancier toe. */
export async function maakLeverancier(formData: FormData): Promise<void> {
  const { supabase, user } = await vereisRedacteurOfHoger();

  const { name, countries, types, carrier, trackingAvailable, trackingAutomatic, notes } = leesVeldenUit(formData);
  if (!name) throw new Error('Een naam is verplicht.');

  const { error } = await supabase.from('suppliers').insert({
    name,
    countries,
    types,
    carrier,
    tracking_available: trackingAvailable,
    tracking_automatic: trackingAutomatic,
    notes,
    reviewed_at: new Date().toISOString(),
    created_by: user.id,
    updated_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath('/leveranciers');
}

/** Slaat wijzigingen aan één leverancier op en markeert 'm als vandaag gecontroleerd. */
export async function bewaarLeverancier(supplierId: string, formData: FormData): Promise<void> {
  const { supabase, user } = await vereisRedacteurOfHoger();

  const { name, countries, types, carrier, trackingAvailable, trackingAutomatic, notes } = leesVeldenUit(formData);
  if (!name) throw new Error('Een naam is verplicht.');

  const { error } = await supabase
    .from('suppliers')
    .update({
      name,
      countries,
      types,
      carrier,
      tracking_available: trackingAvailable,
      tracking_automatic: trackingAutomatic,
      notes,
      reviewed_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', supplierId);
  if (error) throw new Error(error.message);

  revalidatePath('/leveranciers');
}

/** Verwijdert een leverancier definitief uit het overzicht. */
export async function verwijderLeverancier(supplierId: string): Promise<void> {
  const { supabase } = await vereisRedacteurOfHoger();

  const { error } = await supabase.from('suppliers').delete().eq('id', supplierId);
  if (error) throw new Error(error.message);

  revalidatePath('/leveranciers');
}
