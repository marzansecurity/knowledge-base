import Link from 'next/link';
import { redirect } from 'next/navigation';
import { KbShell } from '@/components/kb-shell';
import { createClient } from '@/lib/supabase/server';

export default async function Startpagina() {
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

  const isBeheerder = profiel?.role === 'admin';
  const magBeheren = isBeheerder || profiel?.role === 'editor';

  const [
    { count: aantalGepubliceerd },
    { count: aantalConcepten },
    { count: aantalCategorieen },
    { count: aantalTags },
    { data: recenteArtikelen },
  ] = await Promise.all([
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    magBeheren
      ? supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'draft')
      : Promise.resolve({ count: 0 }),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
    supabase.from('tags').select('id', { count: 'exact', head: true }),
    supabase
      .from('articles')
      .select('slug, title, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(5),
  ]);

  const tegels = [
    {
      href: '/bibliotheek',
      label: 'Gepubliceerde artikelen',
      aantal: aantalGepubliceerd ?? 0,
      kleur: 'bg-teal',
      voetnoot: 'Naar de bibliotheek →',
    },
    ...(magBeheren
      ? [
          {
            href: '/beheer/artikelen?status=draft',
            label: 'Nog te beoordelen',
            aantal: aantalConcepten ?? 0,
            kleur: 'bg-amber',
            voetnoot: 'Concepten uit de Zoho-import →',
          },
        ]
      : []),
    {
      href: '/bibliotheek',
      label: 'Categorieën',
      aantal: aantalCategorieen ?? 0,
      kleur: 'bg-navy-mid',
      voetnoot: 'Bekijk indeling →',
    },
    {
      href: '/bibliotheek',
      label: 'Tags',
      aantal: aantalTags ?? 0,
      kleur: 'bg-orange',
      voetnoot: 'Filter op onderwerp →',
    },
  ];

  return (
    <KbShell naam={profiel?.display_name ?? user.email ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-3.5">
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {tegels.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className="kb-card relative block overflow-hidden p-3.5 transition-shadow hover:shadow-[0_2px_10px_rgba(16,57,91,.12)]"
            >
              <span className={`absolute top-0 left-0 h-full w-1.5 ${t.kleur}`} />
              <div className="kb-label mb-1.5">{t.label}</div>
              <div className="text-[24px] leading-tight font-bold text-navy">{t.aantal}</div>
              <div className="mt-1.5 text-[13px] text-muted">{t.voetnoot}</div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_1.4fr]">
          <div className="kb-card p-3.5">
            <div className="kb-section-title mb-4">Aan de slag</div>
            <div className="flex flex-wrap gap-3">
              <Link href="/bibliotheek" className="kb-chip">
                Bibliotheek
              </Link>
              <Link href="/assistent" className="kb-chip">
                AI-assistent
              </Link>
              <Link href="/onboarding" className="kb-chip">
                Onboarding
              </Link>
              {magBeheren && (
                <>
                  <Link href="/beheer" className="kb-chip">
                    Beheer
                  </Link>
                  <Link href="/beheer/artikelen/nieuw" className="kb-chip">
                    + Nieuw artikel
                  </Link>
                </>
              )}
            </div>
            <p className="mt-5 text-[15px] leading-relaxed text-muted">
              De AI-assistent beantwoordt vragen op basis van de gepubliceerde artikelen en escaleert
              automatisch als iets niet in de kennisbank staat.
            </p>
          </div>

          <div className="kb-card p-3.5">
            <div className="kb-section-title mb-4">Recent bijgewerkt</div>
            {recenteArtikelen && recenteArtikelen.length > 0 ? (
              <ul className="divide-y divide-line">
                {recenteArtikelen.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/bibliotheek/${a.slug}`}
                      className="flex items-center justify-between gap-3 py-3 text-[15px] font-medium text-ink-soft hover:text-navy"
                    >
                      <span className="truncate">{a.title}</span>
                      <span className="shrink-0 text-[13px] text-muted">
                        {new Date(a.updated_at).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="kb-empty">Nog geen gepubliceerde artikelen.</p>
            )}
          </div>
        </div>
      </main>
    </KbShell>
  );
}
