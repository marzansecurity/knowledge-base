import Link from 'next/link';
import { KbShell } from '@/components/kb-shell';
import { StatusBadge } from '@/components/status-badge';
import { vereisBeheerder } from '@/lib/auth';
import type { ArticleStatus } from '@/lib/types';

const STATUSSEN: { waarde: ArticleStatus | 'alle'; label: string }[] = [
  { waarde: 'alle', label: 'Alle' },
  { waarde: 'draft', label: 'Concept' },
  { waarde: 'published', label: 'Gepubliceerd' },
  { waarde: 'outdated', label: 'Verouderd' },
  { waarde: 'archived', label: 'Gearchiveerd' },
];

export default async function ArtikelenBeheerPagina({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { supabase, profiel } = await vereisBeheerder();
  const { status, q } = await searchParams;

  let query = supabase
    .from('articles')
    .select('id, slug, title, status, category_id, reviewed_at, updated_at, categories(name)')
    .order('updated_at', { ascending: false });

  if (status && status !== 'alle') query = query.eq('status', status);
  if (q?.trim()) query = query.ilike('title', `%${q.trim()}%`);

  const { data: artikelen } = await query.limit(300);

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {STATUSSEN.map((s) => {
              const actief = (status ?? 'alle') === s.waarde;
              return (
                <Link
                  key={s.waarde}
                  href={s.waarde === 'alle' ? '/beheer/artikelen' : `/beheer/artikelen?status=${s.waarde}`}
                  className={`kb-chip ${actief ? 'kb-chip-active' : ''}`}
                >
                  {s.label}
                </Link>
              );
            })}
          </div>
          <Link href="/beheer/artikelen/nieuw" className="kb-btn kb-btn-accent">
            + Nieuw artikel
          </Link>
        </div>

        <div className="kb-card overflow-hidden">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-line bg-page">
                <th className="px-5 py-3 text-left text-[12px] font-semibold text-muted">Titel</th>
                <th className="px-5 py-3 text-left text-[12px] font-semibold text-muted">Categorie</th>
                <th className="px-5 py-3 text-left text-[12px] font-semibold text-muted">Status</th>
                <th className="px-5 py-3 text-left text-[12px] font-semibold text-muted">
                  Laatst gewijzigd
                </th>
              </tr>
            </thead>
            <tbody>
              {(artikelen ?? []).map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0 hover:bg-page">
                  <td className="px-5 py-3">
                    <Link href={`/beheer/artikelen/${a.slug}`} className="font-medium text-navy hover:underline">
                      {a.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">
                    {(a.categories as unknown as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {new Date(a.updated_at).toLocaleDateString('nl-NL', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
              {(artikelen ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="kb-empty">
                    Geen artikelen gevonden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </KbShell>
  );
}
