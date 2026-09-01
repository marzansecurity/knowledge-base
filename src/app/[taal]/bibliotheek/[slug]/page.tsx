import { TaalLink } from '@/components/taal-link';
import { notFound, redirect } from 'next/navigation';
import { KbShell } from '@/components/kb-shell';
import { ArtikelMarkdown, haalKoppenOp } from '@/lib/markdown';
import { createClient } from '@/lib/supabase/server';
import { haalArtikel, haalCategorieen, haalTagsVoorArtikel } from '@/lib/data';
import { pad } from '@/lib/paden';
import { isTaal, TAAL_OPMAAK } from '@/lib/talen';
import { haalVertalingen } from '@/lib/vertalingen';

export default async function ArtikelPagina({ params }: PageProps<'/[taal]/bibliotheek/[slug]'>) {
  const { taal, slug } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(pad(taal, '/login'));

  const { data: profiel } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('user_id', user.id)
    .single();

  const artikel = await haalArtikel(supabase, slug, taal);
  if (!artikel) notFound();

  // RLS staat readers alleen published toe, maar we controleren ook zelf
  // zodat een directe link naar een concept nooit per ongeluk zichtbaar is.
  const magBewerken = profiel?.role === 'admin' || profiel?.role === 'editor';
  const magZien = artikel.status === 'published' || magBewerken;
  if (!magZien) notFound();

  const [tags, categorieen] = await Promise.all([
    haalTagsVoorArtikel(supabase, artikel.id, taal),
    artikel.category_id ? haalCategorieen(supabase, taal) : Promise.resolve([]),
  ]);
  const categorie = categorieen.find((c) => c.id === artikel.category_id);

  const koppen = haalKoppenOp(artikel.content_markdown);

  return (
    <KbShell naam={profiel?.display_name ?? user.email ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px]">
        <article className="kb-card p-4 sm:p-6 lg:p-7">
          <nav className="mb-4 text-[13px] text-muted">
            <TaalLink href="/bibliotheek" className="hover:text-navy">
              {t.navigatie.bibliotheek}
            </TaalLink>
            {categorie && (
              <>
                {' / '}
                <TaalLink href={`/bibliotheek?categorie=${categorie.slug}`} className="hover:text-navy">
                  {categorie.name}
                </TaalLink>
              </>
            )}
          </nav>

          {artikel.is_terugval && (
            <p className="mb-4 rounded-md border border-amber bg-[#fffbf5] px-3 py-2 text-[13px] text-amber">
              {t.vertaling.terugvalMelding}
            </p>
          )}

          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[24px] font-bold text-navy">{artikel.title}</h1>
            {artikel.status !== 'published' && (
              <span className="shrink-0 rounded-full border border-amber bg-[#fffbf5] px-3 py-1 text-[13px] font-semibold whitespace-nowrap text-amber">
                {t.labels.status[artikel.status]}
              </span>
            )}
          </div>

          {/* De prozaregel "Geldig voor" komt uit de velden (briefing A4), niet uit de tekst. */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-muted">
            <span className="font-medium text-ink-soft">{t.labels.artikeltype[artikel.type]}</span>
            <span>
              {t.artikel.geldigVoor}{' '}
              {artikel.countries.length > 0
                ? artikel.countries.map((land) => t.labels.land[land]).join(', ')
                : t.artikel.overal}
              {' · '}
              {t.labels.kanaal[artikel.channel]}
            </span>
            {artikel.reviewed_at && (
              <span>
                {t.artikel.laatstGecontroleerd}{' '}
                {new Date(artikel.reviewed_at).toLocaleDateString(TAAL_OPMAAK[taal], {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            )}
            {magBewerken && (
              <TaalLink href={`/beheer/artikelen/${artikel.slug}`} className="kb-chip">
                {t.artikel.bewerken}
              </TaalLink>
            )}
          </div>

          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <TaalLink key={tag.id} href={`/bibliotheek?tags=${tag.name}`} className="kb-chip">
                  {tag.label}
                </TaalLink>
              ))}
            </div>
          )}

          <hr className="mt-6 mb-1 border-line" />

          {/* Leesbare regellengte blijft beperkt, ook al is de pagina eromheen volle breedte. */}
          <div className="mx-auto max-w-[860px]">
            <ArtikelMarkdown>{artikel.content_markdown}</ArtikelMarkdown>
          </div>
        </article>

        {koppen.length > 0 && (
          <aside className="lg:sticky lg:top-[18px] lg:self-start">
            <div className="kb-card p-5">
              <div className="kb-section-title mb-3">{t.artikel.inhoudsopgave}</div>
              <ul className="space-y-2 text-[13px]">
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
