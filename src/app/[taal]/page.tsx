import { TaalLink } from '@/components/taal-link';
import { notFound, redirect } from 'next/navigation';
import { KbShell } from '@/components/kb-shell';
import { createClient } from '@/lib/supabase/server';
import { haalArtikelen } from '@/lib/data';
import { pad } from '@/lib/paden';
import { isTaal, TAAL_OPMAAK } from '@/lib/talen';
import { haalVertalingen } from '@/lib/vertalingen';

export default async function Startpagina({ params }: PageProps<'/[taal]'>) {
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

  const isBeheerder = profiel?.role === 'admin';
  const magBeheren = isBeheerder || profiel?.role === 'editor';

  const [
    { count: aantalGepubliceerd },
    { count: aantalConcepten },
    { count: aantalCategorieen },
    { count: aantalTags },
    gepubliceerdeArtikelen,
  ] = await Promise.all([
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    magBeheren
      ? supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'draft')
      : Promise.resolve({ count: 0 }),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
    supabase.from('tags').select('id', { count: 'exact', head: true }),
    // Via haalArtikelen, zodat titel en slug in de gelezen taal staan.
    haalArtikelen(supabase, { taal }),
  ]);

  const recenteArtikelen = [...gepubliceerdeArtikelen]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);

  const tegels = [
    {
      href: '/bibliotheek',
      label: t.dashboard.gepubliceerdeArtikelen,
      aantal: aantalGepubliceerd ?? 0,
      kleur: 'bg-teal',
      voetnoot: t.dashboard.naarDeBibliotheek,
    },
    ...(magBeheren
      ? [
          {
            href: '/beheer/artikelen?status=draft',
            label: t.dashboard.nogTeBeoordelen,
            aantal: aantalConcepten ?? 0,
            kleur: 'bg-amber',
            voetnoot: t.dashboard.conceptenUitZohoImport,
          },
        ]
      : []),
    {
      href: '/bibliotheek',
      label: t.dashboard.categorieen,
      aantal: aantalCategorieen ?? 0,
      kleur: 'bg-navy-mid',
      voetnoot: t.dashboard.bekijkIndeling,
    },
    {
      href: '/bibliotheek',
      label: t.dashboard.tags,
      aantal: aantalTags ?? 0,
      kleur: 'bg-orange',
      voetnoot: t.dashboard.filterOpOnderwerp,
    },
  ];

  return (
    <KbShell naam={profiel?.display_name ?? user.email ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-5">
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {tegels.map((tegel) => (
            <TaalLink
              key={tegel.label}
              href={tegel.href}
              className="kb-card relative block overflow-hidden p-5 transition-shadow hover:shadow-[0_2px_10px_rgba(16,57,91,.12)]"
            >
              <span className={`absolute top-0 left-0 h-full w-1.5 ${tegel.kleur}`} />
              <div className="kb-label mb-1.5">{tegel.label}</div>
              <div className="text-[24px] leading-tight font-bold text-navy">{tegel.aantal}</div>
              <div className="mt-1.5 text-[13px] text-muted">{tegel.voetnoot}</div>
            </TaalLink>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">
          <div className="kb-card p-5">
            <div className="kb-section-title mb-4">{t.dashboard.aanDeSlag}</div>
            <div className="flex flex-wrap gap-3">
              <TaalLink href="/bibliotheek" className="kb-chip">
                {t.navigatie.bibliotheek}
              </TaalLink>
              <TaalLink href="/assistent" className="kb-chip">
                {t.navigatie.assistent}
              </TaalLink>
              <TaalLink href="/onboarding" className="kb-chip">
                {t.navigatie.onboarding}
              </TaalLink>
              {magBeheren && (
                <>
                  <TaalLink href="/beheer" className="kb-chip">
                    {t.navigatie.beheer}
                  </TaalLink>
                  <TaalLink href="/beheer/artikelen/nieuw" className="kb-chip">
                    {t.dashboard.nieuwArtikel}
                  </TaalLink>
                </>
              )}
            </div>
            <p className="mt-5 text-[15px] leading-relaxed text-muted">{t.dashboard.assistentUitleg}</p>
          </div>

          <div className="kb-card p-5">
            <div className="kb-section-title mb-4">{t.dashboard.recentBijgewerkt}</div>
            {recenteArtikelen.length > 0 ? (
              <ul className="divide-y divide-line">
                {recenteArtikelen.map((a) => (
                  <li key={a.slug}>
                    <TaalLink
                      href={`/bibliotheek/${a.slug}`}
                      className="flex items-center justify-between gap-3 py-3 text-[15px] font-medium text-ink-soft hover:text-navy"
                    >
                      <span className="truncate">{a.title}</span>
                      <span className="shrink-0 text-[13px] text-muted">
                        {new Date(a.updated_at).toLocaleDateString(TAAL_OPMAAK[taal], {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </TaalLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="kb-empty">{t.dashboard.geenGepubliceerdeArtikelen}</p>
            )}
          </div>
        </div>
      </main>
    </KbShell>
  );
}
