import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Header } from '@/components/header';
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

  const [{ count: aantalGepubliceerd }, { count: aantalConcepten }] = await Promise.all([
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    isBeheerder
      ? supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'draft')
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <>
      <Header
        titel="Marzan Kennisbank"
        subtitel="Marzan Security Group"
        naam={profiel?.display_name ?? user.email ?? undefined}
        rol={profiel?.role}
      />

      <main className="mx-auto grid max-w-[720px] gap-4 px-6 py-8">
        <div className={`grid grid-cols-1 gap-4 ${isBeheerder ? 'sm:grid-cols-2' : ''}`}>
          <Link href="/bibliotheek" className="kb-card relative block overflow-hidden p-5 transition-shadow hover:shadow-[0_2px_10px_rgba(16,57,91,.12)]">
            <span className="absolute top-0 left-0 h-full w-1 bg-teal" />
            <div className="kb-label mb-1.5">Gepubliceerde artikelen</div>
            <div className="text-[28px] leading-tight font-bold text-navy">
              {aantalGepubliceerd ?? 0}
            </div>
            <div className="mt-1.5 text-[13px] text-muted">Naar de bibliotheek →</div>
          </Link>

          {isBeheerder && (
            <Link href="/beheer/artikelen?status=draft" className="kb-card relative block overflow-hidden p-5 transition-shadow hover:shadow-[0_2px_10px_rgba(16,57,91,.12)]">
              <span className="absolute top-0 left-0 h-full w-1 bg-amber" />
              <div className="kb-label mb-1.5">Nog te beoordelen</div>
              <div className="text-[28px] leading-tight font-bold text-navy">
                {aantalConcepten ?? 0}
              </div>
              <div className="mt-1.5 text-[13px] text-muted">Concepten uit de Zoho-import →</div>
            </Link>
          )}
        </div>

        <div className="kb-card p-5">
          <div className="kb-section-title mb-3">Aan de slag</div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/bibliotheek" className="kb-chip">
              Bibliotheek
            </Link>
            <Link href="/assistent" className="kb-chip">
              AI-assistent
            </Link>
            {isBeheerder && (
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
          <p className="mt-4 text-[14px] leading-relaxed text-muted">
            De AI-assistent wordt in de volgende stap gebouwd, zodra er artikelen gepubliceerd zijn.
          </p>
        </div>
      </main>
    </>
  );
}
