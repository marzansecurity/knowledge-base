import Link from 'next/link';
import { KbShell } from '@/components/kb-shell';
import { ArtikelMarkdown } from '@/lib/markdown';
import { haalEscalaties } from '@/lib/data';
import { vereisRedacteurOfHoger } from '@/lib/auth';
import { markeerAfgehandeld, heropenEscalatie } from './acties';

const DATUM_OPTIES: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

export default async function EscalatiesPagina({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase, profiel } = await vereisRedacteurOfHoger();
  const { status } = await searchParams;
  const toonAlles = status === 'alle';

  const escalaties = await haalEscalaties(supabase, { alleenOpen: !toonAlles });
  const openAantal = escalaties.filter((e) => !e.resolved_at).length;

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="kb-page-title">Escalatie-inbox</h1>
            <p className="mt-1.5 max-w-[720px] text-[13px] leading-relaxed text-muted">
              Vragen die de AI-assistent niet met zekerheid uit de kennisbank kon beantwoorden. Elke
              openstaande escalatie is een gat in de kennisbank — verwerk de vraag in een artikel en vink
              hem daarna af.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/beheer/escalaties" className={`kb-chip ${!toonAlles ? 'kb-chip-active' : ''}`}>
              Open
            </Link>
            <Link href="/beheer/escalaties?status=alle" className={`kb-chip ${toonAlles ? 'kb-chip-active' : ''}`}>
              Alle
            </Link>
            <Link href="/beheer/voorstellen" className="kb-chip border-navy-mid text-navy-mid">
              Artikel-voorstellen →
            </Link>
          </div>
        </div>

        {!toonAlles && (
          <div className="kb-label">
            {openAantal} openstaande {openAantal === 1 ? 'escalatie' : 'escalaties'}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {escalaties.map((e) => (
            <div key={e.id} className="kb-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-[14px] font-semibold text-navy">{e.vraag}</div>
                  <div className="mt-1 text-[12px] text-muted">
                    {e.gebruiker} · {new Date(e.created_at).toLocaleDateString('nl-NL', DATUM_OPTIES)}
                  </div>
                </div>
                {e.resolved_at ? (
                  <span className="kb-chip bg-teal text-white">Afgehandeld</span>
                ) : (
                  <span className="kb-chip border-amber bg-[#fffbf5] text-amber">Open</span>
                )}
              </div>

              <div className="mt-3 rounded-md border border-line bg-page p-3.5 text-[13px]">
                <ArtikelMarkdown>{e.antwoord}</ArtikelMarkdown>
              </div>

              {e.resolved_at ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <p className="text-[12px] text-ink-soft">
                    {e.resolution_note ? e.resolution_note : 'Afgehandeld zonder notitie.'}
                  </p>
                  <form action={heropenEscalatie.bind(null, e.id)}>
                    <button type="submit" className="kb-btn">
                      Heropenen
                    </button>
                  </form>
                </div>
              ) : (
                <form action={markeerAfgehandeld.bind(null, e.id)} className="mt-3 flex gap-2 border-t border-line pt-3">
                  <input
                    name="resolution_note"
                    placeholder="Notitie (bv. welk artikel dit oplost)…"
                    className="kb-input flex-1"
                  />
                  <button type="submit" className="kb-btn kb-btn-primary whitespace-nowrap">
                    Markeer als afgehandeld
                  </button>
                </form>
              )}
            </div>
          ))}

          {escalaties.length === 0 && (
            <div className="kb-card kb-empty xl:col-span-2">
              {toonAlles ? 'Nog geen escalaties geweest.' : 'Geen openstaande escalaties. Goed bezig.'}
            </div>
          )}
        </div>
      </main>
    </KbShell>
  );
}
