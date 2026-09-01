import { TaalLink } from '@/components/taal-link';
import { KbShell } from '@/components/kb-shell';
import { StatusBadge } from '@/components/status-badge';
import { vereisRedacteurOfHoger } from '@/lib/auth';
import { ARTICLE_STATUSES, ARTICLE_TYPES, type ArticleType } from '@/lib/types';
import { notFound } from 'next/navigation';
import { TAAL_OPMAAK, isTaal } from '@/lib/talen';
import { haalVertalingen } from '@/lib/vertalingen';

export default async function ArtikelenBeheerPagina({
  params,
  searchParams,
}: PageProps<'/[taal]/beheer/artikelen'>) {
  const { taal } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);
  const { supabase, profiel } = await vereisRedacteurOfHoger();
  const { status: statusParam, q: qParam, type: typeParam } = await searchParams;
  const status = typeof statusParam === 'string' ? statusParam : undefined;
  const q = typeof qParam === 'string' ? qParam : undefined;
  const typeFilter = typeof typeParam === 'string' ? typeParam : undefined;

  const statussen = [
    { waarde: 'alle', label: t.algemeen.alles },
    ...ARTICLE_STATUSES.map((s) => ({ waarde: s, label: t.labels.status[s] })),
  ];
  const types = [
    { waarde: 'alle', label: t.algemeen.alles },
    ...ARTICLE_TYPES.map((ty) => ({ waarde: ty, label: t.labels.artikeltype[ty] })),
  ];

  /** Filter-URL die het andere filter intact laat. */
  function filterUrl(nieuweStatus?: string, nieuwType?: string) {
    const p = new URLSearchParams();
    if (nieuweStatus && nieuweStatus !== 'alle') p.set('status', nieuweStatus);
    if (nieuwType && nieuwType !== 'alle') p.set('type', nieuwType);
    const qs = p.toString();
    return qs ? `/beheer/artikelen?${qs}` : '/beheer/artikelen';
  }

  let query = supabase
    .from('articles')
    .select('id, slug, title, status, type, category_id, reviewed_at, updated_at, categories(name)')
    .order('updated_at', { ascending: false });

  if (status && status !== 'alle') query = query.eq('status', status);
  if (typeFilter && typeFilter !== 'alle') query = query.eq('type', typeFilter);
  if (q?.trim()) query = query.ilike('title', `%${q.trim()}%`);

  const { data: artikelen } = await query.limit(300);

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              {statussen.map((s) => {
                const actief = (status ?? 'alle') === s.waarde;
                return (
                  <TaalLink
                    key={s.waarde}
                    href={filterUrl(s.waarde, typeFilter)}
                    className={`kb-chip ${actief ? 'kb-chip-active' : ''}`}
                  >
                    {s.label}
                  </TaalLink>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {types.map((ty) => {
                const actief = (typeFilter ?? 'alle') === ty.waarde;
                return (
                  <TaalLink
                    key={ty.waarde}
                    href={filterUrl(status, ty.waarde)}
                    className={`kb-chip ${actief ? 'kb-chip-active' : ''}`}
                  >
                    {ty.label}
                  </TaalLink>
                );
              })}
            </div>
          </div>
          <TaalLink href="/beheer/artikelen/nieuw" className="kb-btn kb-btn-accent">
            {t.beheer.artikelen.nieuwArtikel}
          </TaalLink>
        </div>

        <div className="kb-card overflow-hidden">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-line bg-page">
                <th className="px-5 py-3 text-left text-[12px] font-semibold text-muted">
                  {t.beheer.artikelen.kolomTitel}
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-semibold text-muted">
                  {t.beheer.artikelen.kolomType}
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-semibold text-muted">
                  {t.beheer.artikelen.kolomCategorie}
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-semibold text-muted">
                  {t.beheer.artikelen.kolomStatus}
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-semibold text-muted">
                  {t.beheer.artikelen.kolomGewijzigd}
                </th>
              </tr>
            </thead>
            <tbody>
              {(artikelen ?? []).map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0 hover:bg-page">
                  <td className="px-5 py-3">
                    <TaalLink href={`/beheer/artikelen/${a.slug}`} className="font-medium text-navy hover:underline">
                      {a.title}
                    </TaalLink>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">
                    {t.labels.artikeltype[a.type as ArticleType]}
                  </td>
                  <td className="px-5 py-3 text-ink-soft">
                    {(a.categories as unknown as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {new Date(a.updated_at).toLocaleDateString(TAAL_OPMAAK[taal], {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
              {(artikelen ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="kb-empty">
                    {t.beheer.artikelen.geenArtikelen}
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
