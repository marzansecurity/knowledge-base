import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { KbShell } from '@/components/kb-shell';
import { ArtikelMarkdown, haalKoppenOp } from '@/lib/markdown';
import { createClient } from '@/lib/supabase/server';
import { haalArtikel, haalTagsVoorArtikel } from '@/lib/data';
import { STATUS_LABEL } from '@/lib/types';

export default async function ArtikelPagina({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profiel } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('user_id', user.id)
    .single();

  const artikel = await haalArtikel(supabase, slug);
  if (!artikel) notFound();

  // RLS staat readers alleen published toe, maar we controleren ook zelf
  // zodat een directe link naar een concept nooit per ongeluk zichtbaar is.
  const magZien = artikel.status === 'published' || profiel?.role === 'admin';
  if (!magZien) notFound();

  const [tags, categorie] = await Promise.all([
    haalTagsVoorArtikel(supabase, artikel.id),
    artikel.category_id
      ? supabase.from('categories').select('name, slug').eq('id', artikel.category_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const koppen = haalKoppenOp(artikel.content_markdown);

  return (
    <KbShell naam={profiel?.display_name ?? user.email ?? undefined} rol={profiel?.role}>
      <main className="grid grid-cols-1 gap-4 px-6 py-[18px] lg:grid-cols-[1fr_220px]">
        <article className="kb-card p-7">
          <nav className="mb-3 text-[11px] text-muted">
            <Link href="/bibliotheek" className="hover:text-navy">
              Bibliotheek
            </Link>
            {categorie?.data && (
              <>
                {' / '}
                <Link href={`/bibliotheek?categorie=${categorie.data.slug}`} className="hover:text-navy">
                  {categorie.data.name}
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[22px] font-bold text-navy">{artikel.title}</h1>
            {artikel.status !== 'published' && (
              <span className="shrink-0 rounded-full border border-amber bg-[#fffbf5] px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-amber">
                {STATUS_LABEL[artikel.status]}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
            {artikel.reviewed_at && (
              <span>
                Laatst gecontroleerd:{' '}
                {new Date(artikel.reviewed_at).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            )}
            {profiel?.role === 'admin' && (
              <Link href={`/beheer/artikelen/${artikel.slug}`} className="kb-chip">
                Bewerken
              </Link>
            )}
          </div>

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Link key={t.id} href={`/bibliotheek?tags=${t.name}`} className="kb-chip">
                  {t.name}
                </Link>
              ))}
            </div>
          )}

          <hr className="mt-5 mb-1 border-line" />

          <ArtikelMarkdown>{artikel.content_markdown}</ArtikelMarkdown>
        </article>

        {koppen.length > 0 && (
          <aside className="lg:sticky lg:top-[18px] lg:self-start">
            <div className="kb-card p-4">
              <div className="kb-section-title mb-2.5">Inhoudsopgave</div>
              <ul className="space-y-1.5 text-[12px]">
                {koppen.map((k) => (
                  <li key={k.id} style={{ paddingLeft: k.niveau === 3 ? '12px' : '0px' }}>
                    <a href={`#${k.id}`} className="text-ink-soft hover:text-orange">
                      {k.tekst}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </main>
    </KbShell>
  );
}
