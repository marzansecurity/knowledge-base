import Link from 'next/link';
import { redirect } from 'next/navigation';
import { KbShell } from '@/components/kb-shell';
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
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid grid-cols-1 gap-5 md:grid-cols-[260px_1fr]">
        <aside className="kb-card p-3.5 md:sticky md:top-[18px] md:self-start">
          <Link href="/assistent" className="kb-btn kb-btn-primary mb-2.5 w-full">
            + Nieuw gesprek
          </Link>
          <ul className="space-y-0.5">
            {gesprekken.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/assistent?gesprek=${g.id}`}
                  className={`block truncate rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                    g.id === gesprek ? 'bg-navy text-white' : 'text-ink-soft hover:bg-page'
                  }`}
                >
                  {g.title || 'Naamloos gesprek'}
                </Link>
              </li>
            ))}
            {gesprekken.length === 0 && (
              <li className="px-2.5 py-1.5 text-[12px] text-muted">Nog geen gesprekken.</li>
            )}
          </ul>
        </aside>

        <AssistentChat key={gesprek ?? 'nieuw'} conversationId={gesprek ?? null} initieleBerichten={berichten} />
      </main>
    </KbShell>
  );
}
