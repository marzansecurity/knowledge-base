import { TaalLink } from '@/components/taal-link';
import { KbShell } from '@/components/kb-shell';
import { ArtikelMarkdown } from '@/lib/markdown';
import { haalEscalaties } from '@/lib/data';
import { vereisRedacteurOfHoger } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { TAAL_OPMAAK, isTaal } from '@/lib/talen';
import { haalVertalingen } from '@/lib/vertalingen';
import { markeerAfgehandeld, heropenEscalatie } from './acties';

const DATUM_OPTIES: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

export default async function EscalatiesPagina({
  params,
  searchParams,
}: PageProps<'/[taal]/beheer/escalaties'>) {
  const { taal } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);
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
            <h1 className="kb-page-title">{t.beheer.escalaties.titel}</h1>
            <p className="mt-1.5 max-w-[720px] text-[13px] leading-relaxed text-muted">
              {t.beheer.escalaties.inleiding}
            </p>
          </div>
          <div className="flex gap-2">
            <TaalLink href="/beheer/escalaties" className={`kb-chip ${!toonAlles ? 'kb-chip-active' : ''}`}>
              {t.beheer.escalaties.filterOpen}
            </TaalLink>
            <TaalLink href="/beheer/escalaties?status=alle" className={`kb-chip ${toonAlles ? 'kb-chip-active' : ''}`}>
              {t.algemeen.alles}
            </TaalLink>
            <TaalLink href="/beheer/voorstellen" className="kb-chip border-navy-mid text-navy-mid">
              {t.beheer.escalaties.naarVoorstellen}
            </TaalLink>
          </div>
        </div>

        {!toonAlles && (
          <div className="kb-label">
            {(openAantal === 1
              ? t.beheer.escalaties.openAantalEen
              : t.beheer.escalaties.openAantalMeer
            ).replace('{aantal}', String(openAantal))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {escalaties.map((e) => (
            <div key={e.id} className="kb-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-[14px] font-semibold text-navy">{e.vraag}</div>
                  <div className="mt-1 text-[12px] text-muted">
                    {e.gebruiker} ·{' '}
                    {new Date(e.created_at).toLocaleDateString(TAAL_OPMAAK[taal], DATUM_OPTIES)}
                  </div>
                </div>
                {e.resolved_at ? (
                  <span className="kb-chip bg-teal text-white">{t.beheer.escalaties.afgehandeld}</span>
                ) : (
                  <span className="kb-chip border-amber bg-[#fffbf5] text-amber">
                    {t.beheer.escalaties.statusOpen}
                  </span>
                )}
              </div>

              <div className="mt-3 rounded-md border border-line bg-page p-3.5 text-[13px]">
                <ArtikelMarkdown>{e.antwoord}</ArtikelMarkdown>
              </div>

              {e.resolved_at ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <p className="text-[12px] text-ink-soft">
                    {e.resolution_note ? e.resolution_note : t.beheer.escalaties.zonderNotitie}
                  </p>
                  <form action={heropenEscalatie.bind(null, e.id)}>
                    <button type="submit" className="kb-btn">
                      {t.beheer.escalaties.heropenen}
                    </button>
                  </form>
                </div>
              ) : (
                <form action={markeerAfgehandeld.bind(null, e.id)} className="mt-3 flex gap-2 border-t border-line pt-3">
                  <input
                    name="resolution_note"
                    placeholder={t.beheer.escalaties.notitiePlaceholder}
                    className="kb-input flex-1"
                  />
                  <button type="submit" className="kb-btn kb-btn-primary whitespace-nowrap">
                    {t.beheer.escalaties.markeerAfgehandeld}
                  </button>
                </form>
              )}
            </div>
          ))}

          {escalaties.length === 0 && (
            <div className="kb-card kb-empty xl:col-span-2">
              {toonAlles ? t.beheer.escalaties.geenOoit : t.beheer.escalaties.geenOpen}
            </div>
          )}
        </div>
      </main>
    </KbShell>
  );
}
