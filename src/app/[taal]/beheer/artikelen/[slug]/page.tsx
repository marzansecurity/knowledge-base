import { notFound } from 'next/navigation';
import { KbShell } from '@/components/kb-shell';
import { ArtikelEditor } from '@/components/artikel-editor';
import { VertaalStrip } from '@/components/vertaal-strip';
import { VertalingEditor } from '@/components/vertaling-editor';
import { vereisRedacteurOfHoger } from '@/lib/auth';
import { haalArtikel, haalCategorieen } from '@/lib/data';
import { isTaal, STANDAARD_TAAL } from '@/lib/talen';
import { haalVertalingen } from '@/lib/vertalingen';
import type { ArticleTranslation } from '@/lib/types';

export default async function ArtikelBewerkenPagina({
  params,
  searchParams,
}: PageProps<'/[taal]/beheer/artikelen/[slug]'>) {
  const { taal, slug } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);
  const { supabase, profiel } = await vereisRedacteurOfHoger();

  // De editor bewerkt altijd het Nederlandse origineel — dat is de bronwaarheid,
  // los van de taal waarin de beheerder de interface gebruikt.
  const [artikel, categorieen] = await Promise.all([
    haalArtikel(supabase, slug, STANDAARD_TAAL),
    haalCategorieen(supabase, taal),
  ]);
  if (!artikel) notFound();

  const [{ data: revisiesRuw }, { data: vertalingenRuw }] = await Promise.all([
    supabase
      .from('article_revisions')
      .select('id, title, saved_at, change_note, locale, profiles(display_name)')
      .eq('article_id', artikel.id)
      .eq('locale', STANDAARD_TAAL)
      .order('saved_at', { ascending: false }),
    supabase
      .from('article_translations')
      .select('article_id, locale, slug, title, summary, content_markdown, review_state, stale, updated_at')
      .eq('article_id', artikel.id),
  ]);

  const revisies = (revisiesRuw ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    saved_at: r.saved_at,
    change_note: r.change_note,
    saved_by_naam: (r.profiles as unknown as { display_name: string } | null)?.display_name ?? null,
  }));

  const vertalingen = (vertalingenRuw ?? []) as ArticleTranslation[];

  // Welke taalversie wordt bewerkt? Zonder parameter het Nederlandse origineel.
  const { vertaling: vertalingParam } = await searchParams;
  const gekozen = typeof vertalingParam === 'string' && isTaal(vertalingParam) ? vertalingParam : STANDAARD_TAAL;

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="mx-auto max-w-4xl space-y-3.5 px-6 py-[18px]">
        <VertaalStrip
          basisPad={`/beheer/artikelen/${slug}`}
          actief={gekozen}
          vertalingen={vertalingen}
          labels={{
            bron: t.vertaling.bronTaal,
            nogNietVertaald: t.vertaling.nogNietVertaald,
            concept: t.labels.vertaalstatus.concept,
            verouderd: t.labels.vertaalstatus.verouderd,
          }}
        />

        {gekozen === STANDAARD_TAAL ? (
          <ArtikelEditor artikel={artikel} categorieen={categorieen} revisies={revisies} />
        ) : (
          <VertalingEditor
            articleId={artikel.id}
            doelTaal={gekozen}
            vertaling={vertalingen.find((v) => v.locale === gekozen) ?? null}
            bron={{
              title: artikel.title,
              summary: artikel.summary,
              content_markdown: artikel.content_markdown,
            }}
          />
        )}
      </main>
    </KbShell>
  );
}
