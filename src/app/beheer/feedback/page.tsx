import Link from 'next/link';
import { KbShell } from '@/components/kb-shell';
import { ArtikelMarkdown } from '@/lib/markdown';
import { haalNietNuttigeAntwoorden } from '@/lib/data';
import { vereisRedacteurOfHoger } from '@/lib/auth';

const DATUM_OPTIES: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

export default async function FeedbackPagina() {
  const { supabase, profiel } = await vereisRedacteurOfHoger();
  const antwoorden = await haalNietNuttigeAntwoorden(supabase);

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-2.5">
        <div>
          <h1 className="kb-page-title">Feedback op AI-antwoorden</h1>
          <p className="mt-1.5 max-w-[720px] text-[13px] leading-relaxed text-muted">
            Antwoorden die een medewerker met 👎 heeft gemarkeerd. Anders dan een escalatie citeerde de
            assistent hier wél een artikel — maar dat artikel hielp niet. Vaak een signaal dat het artikel
            onduidelijk, onvolledig of verouderd is.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
          {antwoorden.map((a) => (
            <div key={a.id} className="kb-card p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="text-[14px] font-semibold text-navy">{a.vraag}</div>
                <span className="shrink-0 text-[12px] text-muted">
                  {a.gebruiker} · {new Date(a.created_at).toLocaleDateString('nl-NL', DATUM_OPTIES)}
                </span>
              </div>

              <div className="mt-3 rounded-md border border-line bg-page p-2.5 text-[13px]">
                <ArtikelMarkdown>{a.antwoord}</ArtikelMarkdown>
              </div>

              {a.bronnen.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <span className="kb-label">Verdachte artikelen:</span>
                  {a.bronnen.map((bron) => (
                    <Link key={bron.slug} href={`/beheer/artikelen/${bron.slug}`} className="kb-chip">
                      {bron.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {antwoorden.length === 0 && (
            <div className="kb-card kb-empty xl:col-span-2">Nog geen negatieve feedback ontvangen.</div>
          )}
        </div>
      </main>
    </KbShell>
  );
}
