'use server';

import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { vereisRedacteurOfHoger } from '@/lib/auth';
import { haalEscalaties } from '@/lib/data';
import { VOORSTEL_SCHEMA, VOORSTEL_SYSTEEMPROMPT } from '@/lib/prompt';

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

type ModelVoorstel = {
  titel: string;
  samenvatting: string;
  inhoud_markdown: string;
  escalatie_indexen: number[];
};

export type GenereerResultaat = { fout?: string; succes?: string };

/**
 * Laat de AI de openstaande escalaties analyseren en groeperen tot artikel-voorstellen.
 * De AI verzint hierbij nooit de procedure zelf — zie VOORSTEL_SYSTEEMPROMPT.
 */
export async function genereerVoorstellen(): Promise<GenereerResultaat> {
  const { supabase, user } = await vereisRedacteurOfHoger();

  const escalaties = await haalEscalaties(supabase, { alleenOpen: true });
  if (escalaties.length < 2) {
    return { fout: 'Te weinig openstaande escalaties om een patroon in te herkennen (minimaal 2 nodig).' };
  }

  const genummerdeLijst = escalaties.map((e, i) => `${i + 1}. ${e.vraag}`).join('\n');

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let response;
  try {
    response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL!,
      max_tokens: 4096,
      system: VOORSTEL_SYSTEEMPROMPT,
      messages: [{ role: 'user', content: genummerdeLijst }],
      output_config: { format: VOORSTEL_SCHEMA, effort: 'medium' },
    });
  } catch (e) {
    return { fout: e instanceof Error ? e.message : 'De AI is niet bereikbaar.' };
  }

  const tekstBlok = response.content.find((b) => b.type === 'text');
  let geparsed: { voorstellen: ModelVoorstel[] } | null = null;
  try {
    geparsed = tekstBlok ? JSON.parse(tekstBlok.text) : null;
  } catch {
    geparsed = null;
  }

  const voorstellen = (geparsed?.voorstellen ?? []).filter((v) => {
    const geldigeIndexen = v.escalatie_indexen.filter((i) => i >= 1 && i <= escalaties.length);
    return geldigeIndexen.length >= 2;
  });

  if (voorstellen.length === 0) {
    return { fout: 'Geen duidelijke herhaalde patronen gevonden in de openstaande escalaties.' };
  }

  for (const v of voorstellen) {
    const bronMessageIds = v.escalatie_indexen
      .filter((i) => i >= 1 && i <= escalaties.length)
      .map((i) => escalaties[i - 1].id);

    const { error } = await supabase.from('article_proposals').insert({
      title: v.titel,
      summary: v.samenvatting,
      content_markdown: v.inhoud_markdown,
      source_message_ids: bronMessageIds,
      created_by: user.id,
    });
    if (error) return { fout: error.message };
  }

  revalidatePath('/beheer/voorstellen');
  revalidatePath('/beheer');
  return { succes: `${voorstellen.length} nieuw${voorstellen.length === 1 ? ' voorstel' : 'e voorstellen'} gegenereerd.` };
}

/** Zet een voorstel om in een concept-artikel en stuurt door naar de editor om het af te ronden. */
export async function maakArtikelVanVoorstel(proposalId: string): Promise<void> {
  const { supabase, user } = await vereisRedacteurOfHoger();

  const { data: voorstel, error: leesFout } = await supabase
    .from('article_proposals')
    .select('title, summary, content_markdown')
    .eq('id', proposalId)
    .single();
  if (leesFout || !voorstel) throw new Error('Voorstel niet gevonden.');

  const basisSlug = maakSlug(voorstel.title);
  let slug = basisSlug;
  for (let i = 2; i < 50; i += 1) {
    const { data } = await supabase.from('articles').select('id').eq('slug', slug).maybeSingle();
    if (!data) break;
    slug = `${basisSlug}-${i}`;
  }

  const { data: artikel, error: insertFout } = await supabase
    .from('articles')
    .insert({
      title: voorstel.title,
      slug,
      summary: voorstel.summary,
      content_markdown: voorstel.content_markdown,
      status: 'draft',
      source: 'handmatig',
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id, slug')
    .single();
  if (insertFout) throw new Error(insertFout.message);

  const { error: updateFout } = await supabase
    .from('article_proposals')
    .update({
      status: 'aangemaakt',
      resulting_article_id: artikel.id,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', proposalId);
  if (updateFout) throw new Error(updateFout.message);

  revalidatePath('/beheer/voorstellen');
  redirect(`/beheer/artikelen/${artikel.slug}`);
}

/** Wijst een voorstel af zonder er een artikel van te maken. */
export async function wijsVoorstelAf(proposalId: string): Promise<void> {
  const { supabase, user } = await vereisRedacteurOfHoger();

  const { error } = await supabase
    .from('article_proposals')
    .update({ status: 'afgewezen', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq('id', proposalId);
  if (error) throw new Error(error.message);

  revalidatePath('/beheer/voorstellen');
}
