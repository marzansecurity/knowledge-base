'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { vereisBeheerder } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ArticleStatus } from '@/lib/types';

const AFBEELDING_BUCKET = 'artikel-afbeeldingen';
const MAX_AFBEELDING_BYTES = 5 * 1024 * 1024;

function maakSlug(titel: string) {
  return (
    titel
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90) || 'artikel'
  );
}

export type OpslaanResultaat = { fout?: string; slug?: string };

/** Maakt een nieuw artikel aan als draft en stuurt door naar de editor. */
export async function maakArtikel(formData: FormData): Promise<void> {
  const { supabase, user } = await vereisBeheerder();

  const titel = String(formData.get('title') ?? '').trim();
  if (!titel) throw new Error('Een titel is verplicht.');

  const basisSlug = maakSlug(titel);
  let slug = basisSlug;
  for (let i = 2; i < 50; i += 1) {
    const { data } = await supabase.from('articles').select('id').eq('slug', slug).maybeSingle();
    if (!data) break;
    slug = `${basisSlug}-${i}`;
  }

  const { error } = await supabase.from('articles').insert({
    title: titel,
    slug,
    content_markdown: '',
    status: 'draft',
    source: 'handmatig',
    created_by: user.id,
    updated_by: user.id,
  });

  if (error) throw new Error(error.message);
  redirect(`/beheer/artikelen/${slug}`);
}

/** Slaat wijzigingen op en legt de vorige versie vast in article_revisions. */
export async function bewaarArtikel(articleId: string, formData: FormData): Promise<OpslaanResultaat> {
  const { supabase, user } = await vereisBeheerder();

  const titel = String(formData.get('title') ?? '').trim();
  const samenvatting = String(formData.get('summary') ?? '').trim() || null;
  const inhoud = String(formData.get('content_markdown') ?? '');
  const categoryId = String(formData.get('category_id') ?? '') || null;
  const wijzignotitie = String(formData.get('change_note') ?? '').trim() || null;

  if (!titel) return { fout: 'Een titel is verplicht.' };

  const { data: huidig, error: leesFout } = await supabase
    .from('articles')
    .select('slug, title, content_markdown')
    .eq('id', articleId)
    .single();
  if (leesFout || !huidig) return { fout: 'Artikel niet gevonden.' };

  // Vorige versie bewaren, alleen als er echt iets is veranderd.
  if (huidig.title !== titel || huidig.content_markdown !== inhoud) {
    await supabase.from('article_revisions').insert({
      article_id: articleId,
      title: huidig.title,
      content_markdown: huidig.content_markdown,
      saved_by: user.id,
      change_note: wijzignotitie,
    });
  }

  const { error } = await supabase
    .from('articles')
    .update({
      title: titel,
      summary: samenvatting,
      content_markdown: inhoud,
      category_id: categoryId,
      updated_by: user.id,
    })
    .eq('id', articleId);

  if (error) return { fout: error.message };

  revalidatePath(`/beheer/artikelen/${huidig.slug}`);
  revalidatePath(`/bibliotheek/${huidig.slug}`);
  revalidatePath('/bibliotheek');
  return { slug: huidig.slug };
}

/** Wijzigt alleen de status (concept, gepubliceerd, verouderd, gearchiveerd). */
export async function wijzigStatus(articleId: string, status: ArticleStatus): Promise<OpslaanResultaat> {
  const { supabase, user } = await vereisBeheerder();

  const veranderingen: Record<string, unknown> = { status, updated_by: user.id };
  if (status === 'published') veranderingen.published_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('articles')
    .update(veranderingen)
    .eq('id', articleId)
    .select('slug')
    .single();

  if (error) return { fout: error.message };

  revalidatePath('/beheer/artikelen');
  revalidatePath('/bibliotheek');
  if (data?.slug) revalidatePath(`/bibliotheek/${data.slug}`);
  return { slug: data?.slug };
}

/** Markeert een artikel als vandaag gecontroleerd. */
export async function markeerGecontroleerd(articleId: string): Promise<OpslaanResultaat> {
  const { supabase } = await vereisBeheerder();
  const { error } = await supabase
    .from('articles')
    .update({ reviewed_at: new Date().toISOString() })
    .eq('id', articleId);
  if (error) return { fout: error.message };
  revalidatePath('/beheer/artikelen');
  return {};
}

/** Zet een artikel terug naar een eerdere revisie (bewaart de huidige als nieuwe revisie). */
export async function herstelRevisie(articleId: string, revisionId: string): Promise<OpslaanResultaat> {
  const { supabase, user } = await vereisBeheerder();

  const { data: revisie, error: revisieFout } = await supabase
    .from('article_revisions')
    .select('title, content_markdown')
    .eq('id', revisionId)
    .single();
  if (revisieFout || !revisie) return { fout: 'Revisie niet gevonden.' };

  const { data: huidig } = await supabase
    .from('articles')
    .select('slug, title, content_markdown')
    .eq('id', articleId)
    .single();
  if (!huidig) return { fout: 'Artikel niet gevonden.' };

  await supabase.from('article_revisions').insert({
    article_id: articleId,
    title: huidig.title,
    content_markdown: huidig.content_markdown,
    saved_by: user.id,
    change_note: 'Automatisch bewaard vóór het terugzetten van een oudere versie',
  });

  const { error } = await supabase
    .from('articles')
    .update({
      title: revisie.title,
      content_markdown: revisie.content_markdown,
      updated_by: user.id,
    })
    .eq('id', articleId);

  if (error) return { fout: error.message };

  revalidatePath(`/beheer/artikelen/${huidig.slug}`);
  revalidatePath(`/bibliotheek/${huidig.slug}`);
  return { slug: huidig.slug };
}

/** Uploadt een afbeelding voor in een artikel en levert het pad om in te voegen in de Markdown. */
export async function uploadAfbeelding(formData: FormData): Promise<{ fout?: string; pad?: string }> {
  const { user } = await vereisBeheerder();

  const bestand = formData.get('bestand');
  if (!(bestand instanceof File)) return { fout: 'Geen bestand ontvangen.' };
  if (!bestand.type.startsWith('image/')) return { fout: 'Alleen afbeeldingen zijn toegestaan.' };
  if (bestand.size > MAX_AFBEELDING_BYTES) return { fout: 'Afbeelding is te groot (max 5 MB).' };

  const extensie = bestand.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const bestandspad = `${user.id}/${randomUUID()}.${extensie}`;

  const admin = createAdminClient();
  const { error } = await admin.storage.from(AFBEELDING_BUCKET).upload(bestandspad, bestand, {
    contentType: bestand.type,
  });
  if (error) return { fout: error.message };

  return { pad: `/api/afbeelding/${bestandspad}` };
}

/** Archiveert een artikel — de enige manier om iets te verwijderen (soft delete). */
export async function archiveerArtikel(articleId: string): Promise<OpslaanResultaat> {
  return wijzigStatus(articleId, 'archived');
}
