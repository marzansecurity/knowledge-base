import { TaalLink } from '@/components/taal-link';
import { KbShell } from '@/components/kb-shell';
import { ArtikelMarkdown } from '@/lib/markdown';
import { haalArtikelVoorstellen } from '@/lib/data';
import { vereisRedacteurOfHoger } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { TAAL_OPMAAK, isTaal } from '@/lib/talen';
import { haalVertalingen } from '@/lib/vertalingen';
import { GenereerKnop } from './genereer-knop';
import { maakArtikelVanVoorstel, wijsVoorstelAf } from './acties';

const DATUM_OPTIES: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

export default async function VoorstellenPagina({
  params,
  searchParams,
}: PageProps<'/[taal]/beheer/voorstellen'>) {
  const { taal } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);
  const { supabase, profiel } = await vereisRedacteurOfHoger();
  const { status } = await searchParams;
  const toonAlles = status === 'alle';

  const voorstellen = await haalArtikelVoorstellen(supabase, { alleenOpen: !toonAlles });

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="kb-page-title">{t.beheer.voorstellen.titel}</h1>
            <p className="mt-1.5 max-w-[720px] text-[13px] leading-relaxed text-muted">
              {t.beheer.voorstellen.inleiding}
            </p>
          </div>
          <div className="flex gap-2">
            <TaalLink href="/beheer/voorstellen" className={`kb-chip ${!toonAlles ? 'kb-chip-active' : ''}`}>
              {t.beheer.voorstellen.filterOpen}
            </TaalLink>
            <TaalLink href="/beheer/voorstellen?status=alle" className={`kb-chip ${toonAlles ? 'kb-chip-active' : ''}`}>
              {t.algemeen.alles}
            </TaalLink>
          </div>
        </div>

        <GenereerKnop />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {voorstellen.map((v) => (
            <div key={v.id} className="kb-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="text-[14px] font-semibold text-navy">{v.title}</div>
                {v.status === 'open' && (
                  <span className="kb-chip border-amber bg-[#fffbf5] text-amber">
                    {t.beheer.voorstellen.statusOpen}
                  </span>
                )}
                {v.status === 'aangemaakt' && (
                  <span className="kb-chip bg-teal text-white">{t.beheer.voorstellen.statusAangemaakt}</span>
                )}
                {v.status === 'afgewezen' && (
                  <span className="kb-chip">{t.beheer.voorstellen.statusAfgewezen}</span>
                )}
              </div>
              {v.summary && <p className="mt-1 text-[12px] text-muted">{v.summary}</p>}

              <div className="mt-3 rounded-md border border-line bg-page p-3.5 text-[13px]">
                <ArtikelMarkdown>{v.content_markdown}</ArtikelMarkdown>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                <span className="kb-label">{t.beheer.voorstellen.gebaseerdOp}</span>
                {v.bronVragen.map((vraag, i) => (
                  <span key={i} className="kb-chip" title={vraag}>
                    {vraag.length > 40 ? `${vraag.slice(0, 40)}…` : vraag}
                  </span>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between text-[12px] text-muted">
                <span>{new Date(v.created_at).toLocaleDateString(TAAL_OPMAAK[taal], DATUM_OPTIES)}</span>
                {v.status === 'open' && (
                  <div className="flex gap-1.5">
                    <form action={wijsVoorstelAf.bind(null, v.id)}>
                      <button type="submit" className="kb-btn">
                        {t.beheer.voorstellen.afwijzen}
                      </button>
                    </form>
                    <form action={maakArtikelVanVoorstel.bind(null, v.id)}>
                      <button type="submit" className="kb-btn kb-btn-primary">
                        {t.beheer.voorstellen.aanmakenAlsConcept}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          ))}

          {voorstellen.length === 0 && (
            <div className="kb-card kb-empty xl:col-span-2">
              {toonAlles ? t.beheer.voorstellen.geenOoit : t.beheer.voorstellen.geenOpen}
            </div>
          )}
        </div>
      </main>
    </KbShell>
  );
}
