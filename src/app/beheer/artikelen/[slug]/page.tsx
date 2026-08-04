import { notFound } from 'next/navigation';
import { KbShell } from '@/components/kb-shell';
import { ArtikelEditor } from '@/components/artikel-editor';
import { vereisBeheerder } from '@/lib/auth';
import { haalArtikel, haalCategorieen } from '@/lib/data';

export default async function ArtikelBewerkenPagina({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase, profiel } = await vereisBeheerder();

  const [artikel, categorieen] = await Promise.all([
    haalArtikel(supabase, slug),
    haalCategorieen(supabase),
  ]);
  if (!artikel) notFound();

  const { data: revisiesRuw } = await supabase
    .from('article_revisions')
    .select('id, title, saved_at, change_note, profiles(display_name)')
    .eq('article_id', artikel.id)
    .order('saved_at', { ascending: false });

  const revisies = (revisiesRuw ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    saved_at: r.saved_at,
    change_note: r.change_note,
    saved_by_naam: (r.profiles as unknown as { display_name: string } | null)?.display_name ?? null,
  }));

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="mx-auto max-w-4xl px-6 py-[18px]">
        <ArtikelEditor artikel={artikel} categorieen={categorieen} revisies={revisies} />
      </main>
    </KbShell>
  );
}
