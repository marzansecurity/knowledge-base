import Link from 'next/link';
import { Header } from '@/components/header';
import { vereisBeheerder } from '@/lib/auth';

export default async function BeheerPagina() {
  const { supabase, profiel } = await vereisBeheerder();

  const [{ count: draft }, { count: published }, { count: outdated }, { count: archived }] =
    await Promise.all([
      supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'outdated'),
      supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'archived'),
    ]);

  const tegels = [
    { label: 'Concept', aantal: draft ?? 0, status: 'draft', kleur: 'bg-amber' },
    { label: 'Gepubliceerd', aantal: published ?? 0, status: 'published', kleur: 'bg-teal' },
    { label: 'Verouderd', aantal: outdated ?? 0, status: 'outdated', kleur: 'bg-orange' },
    { label: 'Gearchiveerd', aantal: archived ?? 0, status: 'archived', kleur: 'bg-muted' },
  ];

  return (
    <>
      <Header
        titel="Marzan Kennisbank"
        subtitel="Beheer"
        naam={profiel?.display_name ?? undefined}
        rol={profiel?.role}
      />

      <main className="grid gap-3.5 px-6 py-[18px]">
        <div className="flex items-center justify-between">
          <h1 className="text-[17px] font-bold text-navy">Artikelbeheer</h1>
          <Link href="/beheer/artikelen/nieuw" className="kb-btn kb-btn-accent">
            + Nieuw artikel
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {tegels.map((t) => (
            <Link
              key={t.status}
              href={`/beheer/artikelen?status=${t.status}`}
              className="kb-card relative overflow-hidden p-4 transition-shadow hover:shadow-[0_2px_10px_rgba(16,57,91,.12)]"
            >
              <span className={`absolute top-0 left-0 h-full w-1 ${t.kleur}`} />
              <div className="kb-label mb-1">{t.label}</div>
              <div className="text-[22px] font-bold text-navy">{t.aantal}</div>
            </Link>
          ))}
        </div>

        <Link href="/beheer/artikelen" className="kb-card p-4 text-[13px] font-medium text-navy hover:bg-page">
          Alle artikelen bekijken en bewerken →
        </Link>

        <Link href="/beheer/export" className="kb-card p-4 text-[13px] font-medium text-navy hover:bg-page">
          Export & back-up →
        </Link>
      </main>
    </>
  );
}
