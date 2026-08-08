import Link from 'next/link';
import { KbShell } from '@/components/kb-shell';
import { vereisRedacteurOfHoger } from '@/lib/auth';
import { telNietNuttigeAntwoorden, telOpenArtikelVoorstellen, telOpenEscalaties } from '@/lib/data';

export default async function BeheerPagina() {
  const { supabase, profiel } = await vereisRedacteurOfHoger();
  const isBeheerder = profiel?.role === 'admin';

  const [
    { count: draft },
    { count: published },
    { count: outdated },
    { count: archived },
    openEscalaties,
    nietNuttig,
    openVoorstellen,
  ] = await Promise.all([
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'outdated'),
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'archived'),
    telOpenEscalaties(supabase),
    telNietNuttigeAntwoorden(supabase),
    telOpenArtikelVoorstellen(supabase),
  ]);

  const tegels = [
    { label: 'Concept', aantal: draft ?? 0, status: 'draft', kleur: 'bg-amber' },
    { label: 'Gepubliceerd', aantal: published ?? 0, status: 'published', kleur: 'bg-teal' },
    { label: 'Verouderd', aantal: outdated ?? 0, status: 'outdated', kleur: 'bg-orange' },
    { label: 'Gearchiveerd', aantal: archived ?? 0, status: 'archived', kleur: 'bg-muted' },
  ];

  const acties = [
    {
      href: '/beheer/artikelen',
      titel: 'Artikelbeheer',
      beschrijving: 'Alle artikelen bekijken, bewerken en publiceren.',
      kleur: 'bg-navy-mid',
      badge: null as number | null,
      badgeKleur: '',
    },
    {
      href: '/beheer/escalaties',
      titel: 'Escalatie-inbox',
      beschrijving: 'Vragen die de assistent niet met zekerheid kon beantwoorden.',
      kleur: 'bg-amber',
      badge: openEscalaties,
      badgeKleur: 'bg-amber',
    },
    {
      href: '/beheer/feedback',
      titel: 'Feedback op AI-antwoorden',
      beschrijving: 'Antwoorden die een medewerker als niet nuttig markeerde.',
      kleur: 'bg-negative',
      badge: nietNuttig,
      badgeKleur: 'bg-negative',
    },
    {
      href: '/beheer/voorstellen',
      titel: 'Artikel-voorstellen',
      beschrijving: 'Door de AI herkende patronen in herhaalde escalaties.',
      kleur: 'bg-blue-light',
      badge: openVoorstellen,
      badgeKleur: 'bg-blue-light',
    },
    ...(isBeheerder
      ? [
          {
            href: '/beheer/gebruikers',
            titel: 'Gebruikers & kennis-toegang',
            beschrijving: 'Nodig medewerkers uit en bepaal wat ze in de AI-context krijgen.',
            kleur: 'bg-teal',
            badge: null as number | null,
            badgeKleur: '',
          },
          {
            href: '/beheer/export',
            titel: 'Export & back-up',
            beschrijving: 'Download de volledige kennisbank als zip-bestand.',
            kleur: 'bg-orange',
            badge: null,
            badgeKleur: '',
          },
        ]
      : []),
  ];

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="kb-page-title">Beheer</h1>
          <Link href="/beheer/artikelen/nieuw" className="kb-btn kb-btn-accent">
            + Nieuw artikel
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {tegels.map((t) => (
            <Link
              key={t.status}
              href={`/beheer/artikelen?status=${t.status}`}
              className="kb-card relative overflow-hidden p-5 transition-shadow hover:shadow-[0_2px_10px_rgba(16,57,91,.12)]"
            >
              <span className={`absolute top-0 left-0 h-full w-1.5 ${t.kleur}`} />
              <div className="kb-label mb-1.5">{t.label}</div>
              <div className="text-[24px] font-bold text-navy">{t.aantal}</div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {acties.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="kb-card relative overflow-hidden p-5 transition-shadow hover:shadow-[0_2px_10px_rgba(16,57,91,.12)]"
            >
              <span className={`absolute top-0 left-0 h-full w-1.5 ${a.kleur}`} />
              <div className="flex items-start justify-between gap-2">
                <div className="text-[15px] font-semibold text-navy">{a.titel}</div>
                {!!a.badge && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white ${a.badgeKleur}`}
                  >
                    {a.badge}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{a.beschrijving}</p>
              <span className="mt-3 inline-block text-[13px] font-medium text-navy">Bekijken →</span>
            </Link>
          ))}
        </div>
      </main>
    </KbShell>
  );
}
