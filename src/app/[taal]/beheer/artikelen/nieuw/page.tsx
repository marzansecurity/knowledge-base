import { KbShell } from '@/components/kb-shell';
import { vereisRedacteurOfHoger } from '@/lib/auth';
import { maakArtikel } from '@/app/[taal]/beheer/artikelen/acties';
import { notFound } from 'next/navigation';
import { isTaal } from '@/lib/talen';
import { haalVertalingen } from '@/lib/vertalingen';

export default async function NieuwArtikelPagina({ params }: PageProps<'/[taal]/beheer/artikelen/nieuw'>) {
  const { taal } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);
  const { profiel } = await vereisRedacteurOfHoger();

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="mx-auto max-w-lg px-6 py-[18px]">
        <form action={maakArtikel} className="kb-card space-y-4 p-6">
          <div>
            <label htmlFor="title" className="kb-label mb-1.5 block">
              {t.beheer.artikelen.nieuw.titelLabel}
            </label>
            <input
              id="title"
              name="title"
              required
              autoFocus
              className="kb-input"
              placeholder={t.beheer.artikelen.nieuw.titelPlaceholder}
            />
          </div>
          <button type="submit" className="kb-btn kb-btn-primary w-full py-2">
            {t.beheer.artikelen.nieuw.aanmaken}
          </button>
          <p className="text-[11px] leading-relaxed text-muted">
            {t.beheer.artikelen.nieuw.toelichting}
          </p>
        </form>
      </main>
    </KbShell>
  );
}
