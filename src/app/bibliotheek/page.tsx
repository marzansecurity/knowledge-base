import { redirect } from 'next/navigation';
import { Header } from '@/components/header';
import { CategorieBoom } from '@/components/categorie-boom';
import { Zoekbalk } from '@/components/zoekbalk';
import { TagFilter } from '@/components/tag-filter';
import { ArtikelKaart } from '@/components/artikel-kaart';
import { createClient } from '@/lib/supabase/server';
import { haalArtikelen, haalCategorieen, haalTags } from '@/lib/data';

export default async function BibliotheekPagina({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string; tags?: string; q?: string }>;
}) {
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

  const { categorie, tags, q } = await searchParams;
  const tagNamen = tags?.split(',').filter(Boolean) ?? [];

  const [categorieen, alleTags, artikelen] = await Promise.all([
    haalCategorieen(supabase),
    haalTags(supabase),
    haalArtikelen(supabase, { categorySlug: categorie, tagNamen, zoekterm: q }),
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

  return (
    <>
      <Header
        titel="Marzan Kennisbank"
        subtitel="Bibliotheek"
        naam={profiel?.display_name ?? user.email ?? undefined}
        rol={profiel?.role}
      />

      <main className="grid grid-cols-1 gap-4 px-6 py-[18px] md:grid-cols-[240px_1fr]">
        <div className="md:sticky md:top-[86px] md:self-start">
          <CategorieBoom
            categorieen={categorieen}
            actieveSlug={categorie}
            aantalPerCategorie={aantalPerCategorie}
          />
        </div>

        <div className="space-y-3.5">
          <div className="kb-card space-y-3 p-4">
            <Zoekbalk basisPad="/bibliotheek" />
            <TagFilter tags={alleTags} basisPad="/bibliotheek" />
          </div>

          <div className="flex items-center justify-between">
            <h1 className="text-[15px] font-bold text-navy">
              {actieveCategorie?.name ?? 'Alle artikelen'}
            </h1>
            <span className="text-[12px] text-muted">
              {artikelen.length} {artikelen.length === 1 ? 'artikel' : 'artikelen'}
            </span>
          </div>

          {artikelen.length === 0 ? (
            <div className="kb-card kb-empty">
              {q
                ? `Niets gevonden voor "${q}". Probeer een ander woord of controleer de spelling.`
                : 'Nog geen gepubliceerde artikelen in deze categorie.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {artikelen.map((a) => (
                <ArtikelKaart key={a.id} artikel={a} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
