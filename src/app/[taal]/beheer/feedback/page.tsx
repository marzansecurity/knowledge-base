import { TaalLink } from '@/components/taal-link';
import { KbShell } from '@/components/kb-shell';
import { ArtikelMarkdown } from '@/lib/markdown';
import { haalNietNuttigeAntwoorden } from '@/lib/data';
import { vereisRedacteurOfHoger } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { TAAL_OPMAAK, isTaal } from '@/lib/talen';
import { haalVertalingen } from '@/lib/vertalingen';

const DATUM_OPTIES: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

export default async function FeedbackPagina({ params }: PageProps<'/[taal]/beheer/feedback'>) {
  const { taal } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);
  const { supabase, profiel } = await vereisRedacteurOfHoger();
  const antwoorden = await haalNietNuttigeAntwoorden(supabase, taal);

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-5">
        <div>
          <h1 className="kb-page-title">{t.beheer.feedback.titel}</h1>
          <p className="mt-1.5 max-w-[720px] text-[13px] leading-relaxed text-muted">
            {t.beheer.feedback.inleiding}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {antwoorden.map((a) => (
            <div key={a.id} className="kb-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="text-[14px] font-semibold text-navy">{a.vraag}</div>
                <span className="shrink-0 text-[12px] text-muted">
                  {a.gebruiker} ·{' '}
                  {new Date(a.created_at).toLocaleDateString(TAAL_OPMAAK[taal], DATUM_OPTIES)}
                </span>
              </div>

              <div className="mt-3 rounded-md border border-line bg-page p-3.5 text-[13px]">
                <ArtikelMarkdown>{a.antwoord}</ArtikelMarkdown>
              </div>

              {a.bronnen.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <span className="kb-label">{t.beheer.feedback.verdachteArtikelen}</span>
                  {a.bronnen.map((bron) => (
                    <TaalLink key={bron.slug} href={`/beheer/artikelen/${bron.slug}`} className="kb-chip">
                      {bron.title}
                    </TaalLink>
                  ))}
                </div>
              )}
            </div>
          ))}

          {antwoorden.length === 0 && (
            <div className="kb-card kb-empty xl:col-span-2">{t.beheer.feedback.geenFeedback}</div>
          )}
        </div>
      </main>
    </KbShell>
  );
}
