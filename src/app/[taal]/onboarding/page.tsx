import { TaalLink } from '@/components/taal-link';
import { notFound } from 'next/navigation';
import { KbShell } from '@/components/kb-shell';
import { GelezenCheckbox } from '@/components/gelezen-checkbox';
import { vereisIngelogd } from '@/lib/auth';
import { bouwCategorieboom, haalArtikelen, haalCategorieen, haalGelezenArtikelIds } from '@/lib/data';
import { haalToegankelijkeCategorieIds } from '@/lib/toegang';
import { isTaal } from '@/lib/talen';
import { haalVertalingen } from '@/lib/vertalingen';
import { zetGelezenStatus } from './acties';

export default async function OnboardingPagina({ params }: PageProps<'/[taal]/onboarding'>) {
  const { taal } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);

  const { supabase, user, profiel } = await vereisIngelogd();
  const isAdmin = profiel?.role === 'admin';

  const toegestaneCategorieIds = isAdmin ? null : await haalToegankelijkeCategorieIds(supabase, user.id);

  const [categorieen, gelezenIds] = await Promise.all([
    haalCategorieen(supabase, taal),
    haalGelezenArtikelIds(supabase, user.id),
  ]);

  const topCategorieen = bouwCategorieboom(categorieen).filter(
    (c) => c.slug === 'start-hier' || !toegestaneCategorieIds || toegestaneCategorieIds.has(c.id),
  );

  const artikelenPerCategorie = await Promise.all(
    topCategorieen.map((c) => haalArtikelen(supabase, { taal, categorySlug: c.slug })),
  );

  const alleArtikelen = artikelenPerCategorie.flat();
  const aantalGelezen = alleArtikelen.filter((a) => gelezenIds.has(a.id)).length;
  const voortgang = alleArtikelen.length > 0 ? Math.round((aantalGelezen / alleArtikelen.length) * 100) : 0;

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="kb-page-title">{t.onboarding.titel}</h1>
            <p className="mt-1.5 max-w-[640px] text-[13px] leading-relaxed text-muted">
              {t.onboarding.uitleg}
            </p>
          </div>

          <div className="kb-card w-full max-w-sm p-4">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-navy">{t.onboarding.voortgang}</span>
              <span className="text-muted">
                {t.onboarding.gelezenVanTotaal
                  .replace('{gelezen}', String(aantalGelezen))
                  .replace('{totaal}', String(alleArtikelen.length))}
              </span>
            </div>
            <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-page">
              <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${voortgang}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {topCategorieen.map((c, i) => {
            const artikelen = artikelenPerCategorie[i];
            if (artikelen.length === 0) return null;
            return (
              <div key={c.id} className="kb-card p-4">
                <div className="kb-section-title mb-2.5">{c.name}</div>
                <ul className="divide-y divide-line">
                  {artikelen.map((a) => (
                    <li key={a.id} className="flex items-center gap-2.5 py-2">
                      <GelezenCheckbox
                        articleId={a.id}
                        initieelGelezen={gelezenIds.has(a.id)}
                        zetGelezenStatus={zetGelezenStatus}
                      />
                      <TaalLink
                        href={`/bibliotheek/${a.slug}`}
                        className={`flex-1 text-[13px] ${
                          gelezenIds.has(a.id) ? 'text-muted line-through' : 'text-ink-soft hover:text-navy'
                        }`}
                      >
                        {a.title}
                      </TaalLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {alleArtikelen.length === 0 && (
            <div className="kb-card kb-empty lg:col-span-2 xl:col-span-3">
              {t.onboarding.geenToegang}
            </div>
          )}
        </div>
      </main>
    </KbShell>
  );
}
