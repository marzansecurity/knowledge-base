import { KbShell } from '@/components/kb-shell';
import { vereisBeheerder } from '@/lib/auth';

export default async function ExportPagina() {
  const { supabase, profiel } = await vereisBeheerder();

  const [{ count: aantalArtikelen }, { count: aantalCategorieen }, { count: aantalTags }] = await Promise.all([
    supabase.from('articles').select('id', { count: 'exact', head: true }),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
    supabase.from('tags').select('id', { count: 'exact', head: true }),
  ]);

  const perStatus = await Promise.all(
    (['draft', 'published', 'outdated', 'archived'] as const).map(async (status) => {
      const { count } = await supabase
        .from('articles')
        .select('id', { count: 'exact', head: true })
        .eq('status', status);
      return { status, count: count ?? 0 };
    }),
  );

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="mx-auto max-w-2xl px-4 py-[18px]">
        <div className="kb-card p-3.5">
          <h1 className="text-[17px] font-bold text-navy">Export & back-up</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Downloadt de volledige kennisbank als een zip-bestand: elk artikel als apart
            Markdown-bestand, plus één <code>manifest.json</code> met alle metadata, categorieën
            en tags. Dit maakt de kennisbank onafhankelijk van deze app — met deze bestanden kun
            je altijd verder, ook zonder Supabase of Anthropic.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {perStatus.map((s) => (
              <div key={s.status} className="kb-card p-3">
                <div className="kb-label">
                  {s.status === 'draft'
                    ? 'Concept'
                    : s.status === 'published'
                      ? 'Gepubliceerd'
                      : s.status === 'outdated'
                        ? 'Verouderd'
                        : 'Gearchiveerd'}
                </div>
                <div className="text-[18px] font-bold text-navy">{s.count}</div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[12px] text-muted">
            In totaal {aantalArtikelen ?? 0} artikelen, {aantalCategorieen ?? 0} categorieën en{' '}
            {aantalTags ?? 0} tags. Alle statussen worden meegenomen — dit is een volledige
            back-up, geen publieke export.
          </p>

          <a
            href="/api/export"
            download
            className="kb-btn kb-btn-primary mt-6 inline-flex w-full justify-center py-2.5"
          >
            Download export (.zip)
          </a>
        </div>
      </main>
    </KbShell>
  );
}
