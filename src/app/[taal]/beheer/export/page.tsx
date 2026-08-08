import { KbShell } from '@/components/kb-shell';
import { vereisBeheerder } from '@/lib/auth';
import { ARTICLE_STATUSES } from '@/lib/types';
import { notFound } from 'next/navigation';
import { isTaal } from '@/lib/talen';
import { haalVertalingen } from '@/lib/vertalingen';

export default async function ExportPagina({ params }: PageProps<'/[taal]/beheer/export'>) {
  const { taal } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);
  const { supabase, profiel } = await vereisBeheerder();

  const [{ count: aantalArtikelen }, { count: aantalCategorieen }, { count: aantalTags }] = await Promise.all([
    supabase.from('articles').select('id', { count: 'exact', head: true }),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
    supabase.from('tags').select('id', { count: 'exact', head: true }),
  ]);

  const perStatus = await Promise.all(
    ARTICLE_STATUSES.map(async (status) => {
      const { count } = await supabase
        .from('articles')
        .select('id', { count: 'exact', head: true })
        .eq('status', status);
      return { status, count: count ?? 0 };
    }),
  );

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="mx-auto max-w-2xl px-6 py-[18px]">
        <div className="kb-card p-5">
          <h1 className="text-[17px] font-bold text-navy">{t.beheer.export.titel}</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            {t.beheer.export.inleidingVoor} <code>manifest.json</code> {t.beheer.export.inleidingNa}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {perStatus.map((s) => (
              <div key={s.status} className="kb-card p-3">
                <div className="kb-label">{t.labels.status[s.status]}</div>
                <div className="text-[18px] font-bold text-navy">{s.count}</div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[12px] text-muted">
            {t.beheer.export.totalen
              .replace('{artikelen}', String(aantalArtikelen ?? 0))
              .replace('{categorieen}', String(aantalCategorieen ?? 0))
              .replace('{tags}', String(aantalTags ?? 0))}
          </p>

          <a
            href="/api/export"
            download
            className="kb-btn kb-btn-primary mt-6 inline-flex w-full justify-center py-2.5"
          >
            {t.beheer.export.download}
          </a>
        </div>
      </main>
    </KbShell>
  );
}
