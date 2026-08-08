import { TaalLink } from '@/components/taal-link';
import { notFound, redirect } from 'next/navigation';
import { KbShell } from '@/components/kb-shell';
import { AssistentChat } from '@/components/assistent-chat';
import { vereisIngelogd } from '@/lib/auth';
import { haalBerichten, haalGesprekken } from '@/lib/data';
import { isTaal } from '@/lib/talen';
import { pad } from '@/lib/paden';
import { haalVertalingen } from '@/lib/vertalingen';

export default async function AssistentPagina({ params, searchParams }: PageProps<'/[taal]/assistent'>) {
  const { taal } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);

  const { supabase, user, profiel } = await vereisIngelogd();
  if (!profiel?.active) redirect(pad(taal, '/'));

  const { gesprek: gesprekParam } = await searchParams;
  const gesprek = typeof gesprekParam === 'string' ? gesprekParam : undefined;

  const [gesprekken, berichten] = await Promise.all([
    haalGesprekken(supabase, user.id),
    gesprek ? haalBerichten(supabase, gesprek, taal) : Promise.resolve([]),
  ]);

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid grid-cols-1 gap-5 md:grid-cols-[260px_1fr]">
        <aside className="kb-card p-3.5 md:sticky md:top-[18px] md:self-start">
          <TaalLink href="/assistent" className="kb-btn kb-btn-primary mb-2.5 w-full">
            {t.assistent.nieuwGesprek}
          </TaalLink>
          <ul className="space-y-0.5">
            {gesprekken.map((g) => (
              <li key={g.id}>
                <TaalLink
                  href={`/assistent?gesprek=${g.id}`}
                  className={`block truncate rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                    g.id === gesprek ? 'bg-navy text-white' : 'text-ink-soft hover:bg-page'
                  }`}
                >
                  {g.title || t.assistent.naamloosGesprek}
                </TaalLink>
              </li>
            ))}
            {gesprekken.length === 0 && (
              <li className="px-2.5 py-1.5 text-[12px] text-muted">{t.assistent.geenGesprekken}</li>
            )}
          </ul>
        </aside>

        <AssistentChat key={gesprek ?? 'nieuw'} conversationId={gesprek ?? null} initieleBerichten={berichten} />
      </main>
    </KbShell>
  );
}
