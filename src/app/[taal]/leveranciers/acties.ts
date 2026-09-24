'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { vereisRedacteurOfHoger } from '@/lib/auth';
import { leesArtikelSlugs, maakLeverancierSlug, VANUIT_LANDEN } from '@/lib/leveranciers';
import { pad } from '@/lib/paden';
import { huidigeTaal } from '@/lib/taal-server';
import {
  AUTOMATION_STATUSES,
  REGIONS,
  SUPPLIER_STEPS,
  SUPPLIER_TYPES,
  type AutomationStatus,
  type Region,
} from '@/lib/types';

function tekstOfNull(formData: FormData, veld: string) {
  return String(formData.get(veld) ?? '').trim() || null;
}

function leesNaam(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Een naam is verplicht.');
  return name;
}

function leesVanuit(formData: FormData) {
  const code = String(formData.get('based_in') ?? '');
  return VANUIT_LANDEN.includes(code) ? code : null;
}

/** Leeg of onbekend = null ("nog niet ingevuld"), nooit stilzwijgend "auto". */
function leesStatus(formData: FormData, veld: string): AutomationStatus | null {
  const waarde = String(formData.get(veld) ?? '');
  return AUTOMATION_STATUSES.includes(waarde as AutomationStatus) ? (waarde as AutomationStatus) : null;
}

/** Alle velden van één regio; de veldnamen beginnen met `<regio>_` (zie RegioVelden). */
function leesRegio(formData: FormData, regio: Region) {
  const p = `${regio}_`;
  return {
    region: regio,
    types: SUPPLIER_TYPES.filter((t) => formData.get(`${p}type_${t}`) === 'on'),
    ...Object.fromEntries(SUPPLIER_STEPS.map((stap) => [`${stap}_status`, leesStatus(formData, `${p}${stap}_status`)])),
    stock_sync_frequency: tekstOfNull(formData, `${p}stock_sync_frequency`),
    carrier: tekstOfNull(formData, `${p}carrier`),
    notes: tekstOfNull(formData, `${p}notes`),
  };
}

function vernieuwPaginas() {
  revalidatePath('/[taal]/leveranciers', 'page');
  revalidatePath('/[taal]/leveranciers/[slug]', 'page');
}

/** Voegt een leverancier toe en stuurt door naar de detailpagina om de rest in te vullen. */
export async function maakLeverancier(formData: FormData): Promise<void> {
  const { supabase, user } = await vereisRedacteurOfHoger();
  const name = leesNaam(formData);
  const regios = REGIONS.filter((r) => formData.get(`regio_${r}`) === 'on');

  // Slug één keer vastleggen; bij een dubbele naam een volgnummer erachter.
  const stam = maakLeverancierSlug(name);
  const { data: bestaand, error: slugFout } = await supabase
    .from('suppliers')
    .select('slug')
    .like('slug', `${stam}%`);
  if (slugFout) throw new Error(slugFout.message);
  const bezet = new Set((bestaand ?? []).map((r) => r.slug as string));
  let slug = stam;
  for (let n = 2; bezet.has(slug); n += 1) slug = `${stam}-${n}`;

  const { data: nieuw, error } = await supabase
    .from('suppliers')
    .insert({ name, slug, based_in: leesVanuit(formData), created_by: user.id, updated_by: user.id })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  if (regios.length > 0) {
    const { error: regioFout } = await supabase
      .from('supplier_regions')
      .insert(regios.map((region) => ({ supplier_id: nieuw.id, region })));
    if (regioFout) throw new Error(regioFout.message);
  }

  vernieuwPaginas();
  redirect(pad(await huidigeTaal(), '/leveranciers', slug));
}

/** Slaat een leverancier en zijn regio's op, en markeert 'm als vandaag gecontroleerd. */
export async function bewaarLeverancier(supplierId: string, formData: FormData): Promise<void> {
  const { supabase, user } = await vereisRedacteurOfHoger();

  const { error } = await supabase
    .from('suppliers')
    .update({
      name: leesNaam(formData),
      based_in: leesVanuit(formData),
      own_stock: formData.get('own_stock') === 'on',
      details_markdown: tekstOfNull(formData, 'details_markdown'),
      related_article_slugs: leesArtikelSlugs(String(formData.get('related_articles') ?? '')),
      reviewed_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', supplierId);
  if (error) throw new Error(error.message);

  // Aangevinkte regio's bijwerken of aanmaken; uitgevinkte verwijderen.
  const actief = REGIONS.filter((r) => formData.get(`${r}_actief`) === 'on');
  const inactief = REGIONS.filter((r) => !actief.includes(r));

  if (actief.length > 0) {
    const { error: fout } = await supabase
      .from('supplier_regions')
      .upsert(
        actief.map((r) => ({ supplier_id: supplierId, ...leesRegio(formData, r) })),
        { onConflict: 'supplier_id,region' },
      );
    if (fout) throw new Error(fout.message);
  }
  if (inactief.length > 0) {
    const { error: fout } = await supabase
      .from('supplier_regions')
      .delete()
      .eq('supplier_id', supplierId)
      .in('region', inactief);
    if (fout) throw new Error(fout.message);
  }

  vernieuwPaginas();
}

/** Verwijdert een leverancier definitief uit het overzicht (de regio's gaan mee). */
export async function verwijderLeverancier(supplierId: string): Promise<void> {
  const { supabase } = await vereisRedacteurOfHoger();

  const { error } = await supabase.from('suppliers').delete().eq('id', supplierId);
  if (error) throw new Error(error.message);

  vernieuwPaginas();
  redirect(pad(await huidigeTaal(), '/leveranciers'));
}
