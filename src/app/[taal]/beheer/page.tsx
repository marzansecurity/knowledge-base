import { TaalLink } from '@/components/taal-link';
import { KbShell } from '@/components/kb-shell';
import { vereisRedacteurOfHoger } from '@/lib/auth';
import { telNietNuttigeAntwoorden, telOpenArtikelVoorstellen, telOpenEscalaties } from '@/lib/data';
import { notFound } from 'next/navigation';
import { isTaal } from '@/lib/talen';
import { haalVertalingen } from '@/lib/vertalingen';

export default async function BeheerPagina({ params }: PageProps<'/[taal]/beheer'>) {
  // De layout heeft de taal al gecontroleerd; hier alleen nog versmallen.
  const { taal } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);
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
    { label: t.labels.status.draft, aantal: draft ?? 0, status: 'draft', kleur: 'bg-amber' },
    { label: t.labels.status.published, aantal: published ?? 0, status: 'published', kleur: 'bg-teal' },
    { label: t.labels.status.outdated, aantal: outdated ?? 0, status: 'outdated', kleur: 'bg-orange' },
    { label: t.labels.status.archived, aantal: archived ?? 0, status: 'archived', kleur: 'bg-muted' },
  ];

  const acties = [
    {
      href: '/beheer/artikelen',
      titel: t.beheer.overzicht.artikelbeheerTitel,
      beschrijving: t.beheer.overzicht.artikelbeheerTekst,
      kleur: 'bg-navy-mid',
      badge: null as number | null,
      badgeKleur: '',
    },
    {
      href: '/beheer/escalaties',
      titel: t.beheer.overzicht.escalatiesTitel,
      beschrijving: t.beheer.overzicht.escalatiesTekst,
      kleur: 'bg-amber',
      badge: openEscalaties,
      badgeKleur: 'bg-amber',
    },
    {
      href: '/beheer/feedback',
      titel: t.beheer.overzicht.feedbackTitel,
      beschrijving: t.beheer.overzicht.feedbackTekst,
      kleur: 'bg-negative',
      badge: nietNuttig,
      badgeKleur: 'bg-negative',
    },
    {
      href: '/beheer/voorstellen',
      titel: t.beheer.overzicht.voorstellenTitel,
      beschrijving: t.beheer.overzicht.voorstellenTekst,
      kleur: 'bg-blue-light',
      badge: openVoorstellen,
      badgeKleur: 'bg-blue-light',
    },
    ...(isBeheerder
      ? [
          {
            href: '/beheer/gebruikers',
            titel: t.beheer.overzicht.gebruikersTitel,
            beschrijving: t.beheer.overzicht.gebruikersTekst,
            kleur: 'bg-teal',
            badge: null as number | null,
            badgeKleur: '',
          },
          {
            href: '/beheer/export',
            titel: t.beheer.overzicht.exportTitel,
            beschrijving: t.beheer.overzicht.exportTekst,
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
          <h1 className="kb-page-title">{t.navigatie.beheer}</h1>
          <TaalLink href="/beheer/artikelen/nieuw" className="kb-btn kb-btn-accent">
            {t.beheer.artikelen.nieuwArtikel}
          </TaalLink>
        </div>

        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {tegels.map((t) => (
            <TaalLink
              key={t.status}
              href={`/beheer/artikelen?status=${t.status}`}
              className="kb-card relative overflow-hidden p-5 transition-shadow hover:shadow-[0_2px_10px_rgba(16,57,91,.12)]"
            >
              <span className={`absolute top-0 left-0 h-full w-1.5 ${t.kleur}`} />
              <div className="kb-label mb-1.5">{t.label}</div>
              <div className="text-[24px] font-bold text-navy">{t.aantal}</div>
            </TaalLink>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {acties.map((a) => (
            <TaalLink
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
              <span className="mt-3 inline-block text-[13px] font-medium text-navy">
                {t.beheer.overzicht.bekijken}
              </span>
            </TaalLink>
          ))}
        </div>
      </main>
    </KbShell>
  );
}
