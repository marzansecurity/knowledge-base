import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Header } from '@/components/header';
import { AssistentChat } from '@/components/assistent-chat';
import { vereisIngelogd } from '@/lib/auth';
import { haalBerichten, haalGesprekken } from '@/lib/data';

export default async function AssistentPagina({
  searchParams,
}: {
  searchParams: Promise<{ gesprek?: string }>;
}) {
  const { supabase, user, profiel } = await vereisIngelogd();
  if (!profiel?.active) redirect('/');

  const { gesprek } = await searchParams;

  const [gesprekken, berichten] = await Promise.all([
    haalGesprekken(supabase, user.id),
    gesprek ? haalBerichten(supabase, gesprek) : Promise.resolve([]),
  ]);

  return (
    <>
      <Header
        titel="Marzan Kennisbank"
        subtitel="AI-assistent"
        naam={profiel?.display_name ?? undefined}
        rol={profiel?.role}
      />

      <main className="grid grid-cols-1 gap-4 px-6 py-[18px] md:grid-cols-[220px_1fr]">
        <aside className="kb-card p-3 md:sticky md:top-[86px] md:self-start">
          <Link href="/assistent" className="kb-btn kb-btn-primary mb-2.5 w-full">
            + Nieuw gesprek
          </Link>
          <ul className="space-y-0.5">
            {gesprekken.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/assistent?gesprek=${g.id}`}
                  className={`block truncate rounded-md px-2 py-1.5 text-[12px] transition-colors ${
                    g.id === gesprek ? 'bg-navy text-white' : 'text-ink-soft hover:bg-page'
                  }`}
                >
                  {g.title || 'Naamloos gesprek'}
                </Link>
              </li>
            ))}
            {gesprekken.length === 0 && (
              <li className="px-2 py-1.5 text-[11px] text-muted">Nog geen gesprekken.</li>
            )}
          </ul>
        </aside>

        <AssistentChat key={gesprek ?? 'nieuw'} conversationId={gesprek ?? null} initieleBerichten={berichten} />
      </main>
    </>
  );
}
