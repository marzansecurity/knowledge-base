'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { vereisRedacteurOfHoger } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { huidigeTaal } from '@/lib/taal-server';
import { pad } from '@/lib/paden';
import { STANDAARD_TAAL, type Taal } from '@/lib/talen';
import {
  ARTICLE_CHANNELS,
  ARTICLE_TYPES,
  COUNTRIES,
  type ArticleChannel,
  type ArticleStatus,
  type ArticleTranslation,
  type ArticleType,
  type Country,
} from '@/lib/types';

// Revalideren gebeurt op het routepatroon in plaats van op een concreet pad:
// één aanroep dekt dan alle talen tegelijk.
const ROUTE_ARTIKEL_BEHEER = '/[taal]/beheer/artikelen/[slug]';
const ROUTE_ARTIKELEN_BEHEER = '/[taal]/beheer/artikelen';
const ROUTE_ARTIKEL_PUBLIEK = '/[taal]/bibliotheek/[slug]';
const ROUTE_BIBLIOTHEEK = '/[taal]/bibliotheek';

const AFBEELDING_BUCKET = 'artikel-afbeeldingen';
const MAX_AFBEELDING_BYTES = 5 * 1024 * 1024;

/**
 * Reviewtermijn bij publicatie, in maanden (briefing A5, bevestigd 1 sept 2026):
 * 6 maanden voor alles. Pas het hier aan, dit is de enige plek.
 */
const REVIEW_TERMIJN_MAANDEN = 6;

function isArticleType(waarde: string): waarde is ArticleType {
  return (ARTICLE_TYPES as string[]).includes(waarde);
}

function isChannel(waarde: string): waarde is ArticleChannel {
  return (ARTICLE_CHANNELS as string[]).includes(waarde);
}

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
  const { supabase, user } = await vereisRedacteurOfHoger();

  const titel = String(formData.get('title') ?? '').trim();
  if (!titel) throw new Error('Een titel is verplicht.');

  // Werkafspraak (AGENTS.md): een nieuw artikel krijgt altijd een type en een
  // eigenaar. Het type bepaalt het sjabloon, de eigenaar is aanspreekbaar bij review.
  const typeWaarde = String(formData.get('type') ?? '');
  if (!isArticleType(typeWaarde)) throw new Error('Kies een artikeltype.');

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
    type: typeWaarde,
    source: 'handmatig',
    owner_id: user.id,
    created_by: user.id,
    updated_by: user.id,
  });

  if (error) throw new Error(error.message);
  redirect(pad(await huidigeTaal(), '/beheer/artikelen', slug));
}

/** Slaat wijzigingen op en legt de vorige versie vast in article_revisions. */
export async function bewaarArtikel(articleId: string, formData: FormData): Promise<OpslaanResultaat> {
  const { supabase, user } = await vereisRedacteurOfHoger();

  const titel = String(formData.get('title') ?? '').trim();
  const samenvatting = String(formData.get('summary') ?? '').trim() || null;
  const inhoud = String(formData.get('content_markdown') ?? '');
  const categoryId = String(formData.get('category_id') ?? '') || null;
  const wijzignotitie = String(formData.get('change_note') ?? '').trim() || null;

  const typeWaarde = String(formData.get('type') ?? '');
  const kanaalWaarde = String(formData.get('channel') ?? '');
  const landen = formData
    .getAll('countries')
    .map(String)
    .filter((l): l is Country => (COUNTRIES as string[]).includes(l));
  const padVolgordeRuw = String(formData.get('path_order') ?? '').trim();
  const padVolgorde = padVolgordeRuw ? Number.parseInt(padVolgordeRuw, 10) : null;
  const verplicht = formData.get('required_reading') === 'on';

  if (!titel) return { fout: 'Een titel is verplicht.' };
  if (!isArticleType(typeWaarde)) return { fout: 'Kies een artikeltype.' };
  if (!isChannel(kanaalWaarde)) return { fout: 'Kies een kanaal.' };
  if (padVolgorde !== null && !Number.isFinite(padVolgorde)) {
    return { fout: 'De leerpad-volgorde moet een getal zijn.' };
  }

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
      type: typeWaarde,
      channel: kanaalWaarde,
      countries: landen,
      path_order: padVolgorde,
      required_reading: verplicht,
      updated_by: user.id,
    })
    .eq('id', articleId);

  if (error) return { fout: error.message };

  revalidatePath(ROUTE_ARTIKEL_BEHEER, 'page');
  revalidatePath(ROUTE_ARTIKEL_PUBLIEK, 'page');
  revalidatePath(ROUTE_BIBLIOTHEEK, 'page');
  return { slug: huidig.slug };
}

/** Wijzigt alleen de status (concept, gepubliceerd, verouderd, gearchiveerd). */
export async function wijzigStatus(articleId: string, status: ArticleStatus): Promise<OpslaanResultaat> {
  const { supabase, user } = await vereisRedacteurOfHoger();

  const veranderingen: Record<string, unknown> = { status, updated_by: user.id };
  if (status === 'published') {
    veranderingen.published_at = new Date().toISOString();

    // Reviewdatum meegeven (briefing A5): kennis veroudert, dus elk gepubliceerd
    // artikel komt na een vaste termijn terug op het beheer-dashboard.
    const due = new Date();
    due.setMonth(due.getMonth() + REVIEW_TERMIJN_MAANDEN);
    veranderingen.review_due_at = due.toISOString();
  }

  const { data, error } = await supabase
    .from('articles')
    .update(veranderingen)
    .eq('id', articleId)
    .select('slug')
    .single();

  if (error) return { fout: error.message };

  revalidatePath(ROUTE_ARTIKELEN_BEHEER, 'page');
  revalidatePath(ROUTE_BIBLIOTHEEK, 'page');
  revalidatePath(ROUTE_ARTIKEL_PUBLIEK, 'page');
  return { slug: data?.slug };
}

/** Markeert een artikel als vandaag gecontroleerd en schuift de reviewdatum door. */
export async function markeerGecontroleerd(articleId: string): Promise<OpslaanResultaat> {
  const { supabase } = await vereisRedacteurOfHoger();

  const due = new Date();
  due.setMonth(due.getMonth() + REVIEW_TERMIJN_MAANDEN);

  const { error } = await supabase
    .from('articles')
    .update({ reviewed_at: new Date().toISOString(), review_due_at: due.toISOString() })
    .eq('id', articleId);
  if (error) return { fout: error.message };
  revalidatePath(ROUTE_ARTIKELEN_BEHEER, 'page');
  return {};
}

/** Zet een artikel terug naar een eerdere revisie (bewaart de huidige als nieuwe revisie). */
export async function herstelRevisie(articleId: string, revisionId: string): Promise<OpslaanResultaat> {
  const { supabase, user } = await vereisRedacteurOfHoger();

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

  revalidatePath(ROUTE_ARTIKEL_BEHEER, 'page');
  revalidatePath(ROUTE_ARTIKEL_PUBLIEK, 'page');
  return { slug: huidig.slug };
}

/** Uploadt een afbeelding voor in een artikel en levert het pad om in te voegen in de Markdown. */
export async function uploadAfbeelding(formData: FormData): Promise<{ fout?: string; pad?: string }> {
  const { user } = await vereisRedacteurOfHoger();

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

/** Alle taalversies van een artikel, voor de taalstrip in de editor. */
export async function haalVertalingen(articleId: string): Promise<ArticleTranslation[]> {
  const { supabase } = await vereisRedacteurOfHoger();
  const { data } = await supabase
    .from('article_translations')
    .select('article_id, locale, slug, title, summary, content_markdown, review_state, stale, updated_at')
    .eq('article_id', articleId);
  return (data ?? []) as ArticleTranslation[];
}

/**
 * Bewaart een vertaling. Het Nederlands loopt bewust NIET via deze weg: dat is
 * de bronwaarheid en wordt via bewaarArtikel() op `articles` opgeslagen, waarna
 * een databasetrigger de nl-rij bijwerkt.
 */
export async function bewaarVertaling(
  articleId: string,
  taal: Taal,
  formData: FormData,
): Promise<OpslaanResultaat> {
  const { supabase, user } = await vereisRedacteurOfHoger();

  if (taal === STANDAARD_TAAL) {
    return { fout: 'Het Nederlands is de brontaal en wordt via het artikel zelf opgeslagen.' };
  }

  const titel = String(formData.get('title') ?? '').trim();
  const samenvatting = String(formData.get('summary') ?? '').trim() || null;
  const inhoud = String(formData.get('content_markdown') ?? '');
  const slug = String(formData.get('slug') ?? '').trim();

  if (!titel) return { fout: 'Een titel is verplicht.' };
  if (!slug) return { fout: 'Een slug is verplicht.' };

  // Vorige versie van deze taal bewaren, zodat terugzetten ook per taal kan.
  const { data: vorige } = await supabase
    .from('article_translations')
    .select('title, content_markdown')
    .eq('article_id', articleId)
    .eq('locale', taal)
    .maybeSingle();

  if (vorige && (vorige.title !== titel || vorige.content_markdown !== inhoud)) {
    await supabase.from('article_revisions').insert({
      article_id: articleId,
      locale: taal,
      title: vorige.title,
      content_markdown: vorige.content_markdown,
      saved_by: user.id,
    });
  }

  const { error } = await supabase.from('article_translations').upsert(
    {
      article_id: articleId,
      locale: taal,
      slug,
      title: titel,
      summary: samenvatting,
      content_markdown: inhoud,
      // Handmatig opgeslagen betekent nog niet nagekeken; dat is een aparte
      // bewuste stap via markeerVertalingNagekeken().
      review_state: 'concept',
      stale: false,
      updated_by: user.id,
    },
    { onConflict: 'article_id,locale' },
  );

  if (error) return { fout: error.message };

  revalidatePath(ROUTE_ARTIKEL_BEHEER, 'page');
  revalidatePath(ROUTE_ARTIKEL_PUBLIEK, 'page');
  revalidatePath(ROUTE_BIBLIOTHEEK, 'page');
  return { slug };
}

/** Zet een vertaling op "nagekeken" — de redacteur heeft hem gecontroleerd. */
export async function markeerVertalingNagekeken(
  articleId: string,
  taal: Taal,
): Promise<OpslaanResultaat> {
  const { supabase, user } = await vereisRedacteurOfHoger();

  const { error } = await supabase
    .from('article_translations')
    .update({ review_state: 'nagekeken', stale: false, updated_by: user.id })
    .eq('article_id', articleId)
    .eq('locale', taal);

  if (error) return { fout: error.message };

  revalidatePath(ROUTE_ARTIKEL_BEHEER, 'page');
  return {};
}
