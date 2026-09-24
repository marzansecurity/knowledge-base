'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { vereisRedacteurOfHoger } from '@/lib/auth';
import { leesArtikelSlugs, maakLeverancierSlug } from '@/lib/leveranciers';
import { pad } from '@/lib/paden';
import { huidigeTaal } from '@/lib/taal-server';
import { AUTOMATION_STATUSES, COUNTRIES, SUPPLIER_STEPS, SUPPLIER_TYPES, type AutomationStatus } from '@/lib/types';

function tekstOfNull(formData: FormData, veld: string) {
  return String(formData.get(veld) ?? '').trim() || null;
}

function leesBasis(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Een naam is verplicht.');
  return {
    name,
    countries: COUNTRIES.filter((c) => formData.get(`country_${c}`) === 'on'),
    types: SUPPLIER_TYPES.filter((t) => formData.get(`type_${t}`) === 'on'),
  };
}

/** Leeg of onbekend = null ("nog niet ingevuld"), nooit stilzwijgend "auto". */
function leesStatus(formData: FormData, veld: string): AutomationStatus | null {
  const waarde = String(formData.get(veld) ?? '');
  return AUTOMATION_STATUSES.includes(waarde as AutomationStatus) ? (waarde as AutomationStatus) : null;
}

function vernieuwPaginas() {
  revalidatePath('/[taal]/leveranciers', 'page');
  revalidatePath('/[taal]/leveranciers/[slug]', 'page');
}

/** Voegt een leverancier toe en stuurt door naar de detailpagina om de rest in te vullen. */
export async function maakLeverancier(formData: FormData): Promise<void> {
  const { supabase, user } = await vereisRedacteurOfHoger();
  const basis = leesBasis(formData);

  // Slug één keer vastleggen; bij een dubbele naam een volgnummer erachter.
  const stam = maakLeverancierSlug(basis.name);
  const { data: bestaand, error: slugFout } = await supabase
    .from('suppliers')
    .select('slug')
    .like('slug', `${stam}%`);
  if (slugFout) throw new Error(slugFout.message);
  const bezet = new Set((bestaand ?? []).map((r) => r.slug as string));
  let slug = stam;
  for (let n = 2; bezet.has(slug); n += 1) slug = `${stam}-${n}`;

  const { error } = await supabase.from('suppliers').insert({
    ...basis,
    slug,
    created_by: user.id,
    updated_by: user.id,
  });
  if (error) throw new Error(error.message);

  vernieuwPaginas();
  redirect(pad(await huidigeTaal(), '/leveranciers', slug));
}

/** Slaat alle velden van één leverancier op en markeert 'm als vandaag gecontroleerd. */
export async function bewaarLeverancier(supplierId: string, formData: FormData): Promise<void> {
  const { supabase, user } = await vereisRedacteurOfHoger();

  const statussen = Object.fromEntries(
    SUPPLIER_STEPS.map((stap) => [`${stap}_status`, leesStatus(formData, `${stap}_status`)]),
  );

  const { error } = await supabase
    .from('suppliers')
    .update({
      ...leesBasis(formData),
      ...statussen,
      stock_sync_frequency: tekstOfNull(formData, 'stock_sync_frequency'),
      carrier: tekstOfNull(formData, 'carrier'),
      notes: tekstOfNull(formData, 'notes'),
      details_markdown: tekstOfNull(formData, 'details_markdown'),
      related_article_slugs: leesArtikelSlugs(String(formData.get('related_articles') ?? '')),
      reviewed_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', supplierId);
  if (error) throw new Error(error.message);

  vernieuwPaginas();
}

/** Verwijdert een leverancier definitief uit het overzicht. */
export async function verwijderLeverancier(supplierId: string): Promise<void> {
  const { supabase } = await vereisRedacteurOfHoger();

  const { error } = await supabase.from('suppliers').delete().eq('id', supplierId);
  if (error) throw new Error(error.message);

  vernieuwPaginas();
  redirect(pad(await huidigeTaal(), '/leveranciers'));
}
