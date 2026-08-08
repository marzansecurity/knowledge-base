import { notFound, redirect } from 'next/navigation';
import { KbShell } from '@/components/kb-shell';
import { CategorieBoom } from '@/components/categorie-boom';
import { Zoekbalk } from '@/components/zoekbalk';
import { TagFilter } from '@/components/tag-filter';
import { ArtikelKaart } from '@/components/artikel-kaart';
import { createClient } from '@/lib/supabase/server';
import { haalArtikelen, haalCategorieen, haalTags } from '@/lib/data';
import { pad } from '@/lib/paden';
import { isTaal } from '@/lib/talen';
import { haalVertalingen } from '@/lib/vertalingen';

export default async function BibliotheekPagina({
  params,
  searchParams,
}: PageProps<'/[taal]/bibliotheek'>) {
  const { taal } = await params;
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

  // Een zoekparameter kan ook meermaals in de URL staan; we gebruiken alleen
  // enkelvoudige waarden en negeren de rest.
  const ruweParams = await searchParams;
  const categorie = typeof ruweParams.categorie === 'string' ? ruweParams.categorie : undefined;
  const zoekterm = typeof ruweParams.q === 'string' ? ruweParams.q : undefined;
  const tagNamen = (typeof ruweParams.tags === 'string' ? ruweParams.tags : '')
    .split(',')
    .filter(Boolean);

  const [categorieen, alleTags, artikelen] = await Promise.all([
    haalCategorieen(supabase, taal),
    haalTags(supabase, taal),
    haalArtikelen(supabase, { taal, categorySlug: categorie, tagNamen, zoekterm }),
  ]);

  // Aantal gepubliceerde artikelen per categorie, voor de boom.
  const { data: allePublicaties } = await supabase
    .from('articles')
    .select('category_id')
    .eq('status', 'published');
  const aantalPerCategorie: Record<string, number> = {};
  for (const a of allePublicaties ?? []) {
    if (!a.category_id) continue;
    aantalPerCategorie[a.category_id] = (aantalPerCategorie[a.category_id] ?? 0) + 1;
  }

  const actieveCategorie = categorie ? categorieen.find((c) => c.slug === categorie) : null;

  const aantalTekst = (
    artikelen.length === 1 ? t.bibliotheek.artikelEnkelvoud : t.bibliotheek.artikelMeervoud
  ).replace('{aantal}', String(artikelen.length));

  return (
    <KbShell naam={profiel?.display_name ?? user.email ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid grid-cols-1 gap-5 md:grid-cols-[240px_1fr]">
        <div className="md:sticky md:top-[18px] md:self-start">
          <CategorieBoom
            categorieen={categorieen}
            actieveSlug={categorie}
            aantalPerCategorie={aantalPerCategorie}
          />
        </div>

        <div className="space-y-4">
          <div className="kb-card space-y-3 p-4">
            <Zoekbalk basisPad="/bibliotheek" />
            <TagFilter tags={alleTags} basisPad="/bibliotheek" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="kb-page-title">{actieveCategorie?.name ?? t.bibliotheek.alleArtikelen}</h1>
            <span className="text-[13px] text-muted">{aantalTekst}</span>
          </div>

          {artikelen.length === 0 ? (
            <div className="kb-card kb-empty">
              {zoekterm
                ? t.bibliotheek.nietsGevonden.replace('{zoekterm}', zoekterm)
                : t.bibliotheek.geenArtikelenInCategorie}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {artikelen.map((a) => (
                <ArtikelKaart key={a.id} artikel={a} />
              ))}
            </div>
          )}
        </div>
      </main>
    </KbShell>
  );
}
