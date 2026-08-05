import Link from 'next/link';
import { KbShell } from '@/components/kb-shell';
import { GelezenCheckbox } from '@/components/gelezen-checkbox';
import { vereisIngelogd } from '@/lib/auth';
import { bouwCategorieboom, haalArtikelen, haalCategorieen, haalGelezenArtikelIds } from '@/lib/data';
import { haalToegankelijkeCategorieIds } from '@/lib/toegang';
import { zetGelezenStatus } from './acties';

export default async function OnboardingPagina() {
  const { supabase, user, profiel } = await vereisIngelogd();
  const isAdmin = profiel?.role === 'admin';

  const toegestaneCategorieIds = isAdmin ? null : await haalToegankelijkeCategorieIds(supabase, user.id);

  const [categorieen, gelezenIds] = await Promise.all([
    haalCategorieen(supabase),
    haalGelezenArtikelIds(supabase, user.id),
  ]);

  const topCategorieen = bouwCategorieboom(categorieen).filter(
    (c) => c.slug === 'start-hier' || !toegestaneCategorieIds || toegestaneCategorieIds.has(c.id),
  );

  const artikelenPerCategorie = await Promise.all(
    topCategorieen.map((c) => haalArtikelen(supabase, { categorySlug: c.slug })),
  );

  const alleArtikelen = artikelenPerCategorie.flat();
  const aantalGelezen = alleArtikelen.filter((a) => gelezenIds.has(a.id)).length;
  const voortgang = alleArtikelen.length > 0 ? Math.round((aantalGelezen / alleArtikelen.length) * 100) : 0;

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="mx-auto grid max-w-[760px] gap-4 px-6 py-8">
        <div>
          <h1 className="text-[20px] font-bold text-navy">Onboarding-checklist</h1>
          <p className="mt-1 text-[13px] text-muted">
            De procedures die voor jouw rol relevant zijn. Vink een artikel af zodra je het hebt gelezen —
            dat is alleen voor jouzelf, om je voortgang bij te houden.
          </p>
        </div>

        <div className="kb-card p-4">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium text-navy">Voortgang</span>
            <span className="text-muted">
              {aantalGelezen} / {alleArtikelen.length} gelezen
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-page">
            <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${voortgang}%` }} />
          </div>
        </div>

        <div className="grid gap-4">
          {topCategorieen.map((c, i) => {
            const artikelen = artikelenPerCategorie[i];
            if (artikelen.length === 0) return null;
            return (
              <div key={c.id} className="kb-card p-4">
                <div className="kb-section-title mb-2.5">{c.name}</div>
                <ul className="divide-y divide-line">
                  {artikelen.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 py-2">
                      <GelezenCheckbox
                        articleId={a.id}
                        initieelGelezen={gelezenIds.has(a.id)}
                        zetGelezenStatus={zetGelezenStatus}
                      />
                      <Link
                        href={`/bibliotheek/${a.slug}`}
                        className={`flex-1 text-[13px] ${
                          gelezenIds.has(a.id) ? 'text-muted line-through' : 'text-ink-soft hover:text-navy'
                        }`}
                      >
                        {a.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {alleArtikelen.length === 0 && (
            <div className="kb-card kb-empty">
              Nog geen artikelen beschikbaar voor jouw toegang. Vraag Martijn om je kennis-toegang in te
              stellen.
            </div>
          )}
        </div>
      </main>
    </KbShell>
  );
}
