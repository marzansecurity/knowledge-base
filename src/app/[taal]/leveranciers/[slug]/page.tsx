import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { AutomatiseringBadge } from '@/components/automatisering-badge';
import { KbShell } from '@/components/kb-shell';
import { KolomKop, RegioVelden, VanuitKeuze } from '@/components/leverancier-velden';
import { TaalLink } from '@/components/taal-link';
import { vereisIngelogd } from '@/lib/auth';
import { haalArtikelLinks, haalLeverancier } from '@/lib/data';
import { isGemengd, landNaam, regioVan, statusVan } from '@/lib/leveranciers';
import { haalKolomUitleg, type KolomUitleg } from '@/lib/leveranciers-uitleg';
import { ArtikelMarkdown } from '@/lib/markdown';
import { isTaal, TAAL_OPMAAK, type Taal } from '@/lib/talen';
import { haalVertalingen, type Berichten } from '@/lib/vertalingen';
import { REGIONS, SUPPLIER_COLUMNS, type Supplier, type SupplierColumn, type SupplierRegion } from '@/lib/types';
import { bewaarLeverancier, verwijderLeverancier } from '../acties';

export default async function LeverancierPagina({ params }: PageProps<'/[taal]/leveranciers/[slug]'>) {
  const { taal, slug } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);

  const { supabase, profiel } = await vereisIngelogd();
  const magBewerken = profiel?.role === 'admin' || profiel?.role === 'editor';

  const s = await haalLeverancier(supabase, slug);
  if (!s) notFound();

  const [uitleg, artikelLinks] = await Promise.all([
    haalKolomUitleg(supabase, taal),
    haalArtikelLinks(supabase, s.related_article_slugs, taal),
  ]);

  const gekoppeld = s.related_article_slugs
    .map((artikelSlug) => artikelLinks.get(artikelSlug))
    .filter((a): a is { slug: string; title: string } => Boolean(a));

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-5">
        <TaalLink href="/leveranciers" className="text-[13px] text-muted hover:text-navy">
          {t.leveranciers.terugNaarOverzicht}
        </TaalLink>

        <div className={`kb-card p-4 sm:p-6 ${s.own_stock ? 'border-l-4 border-l-navy-mid bg-[#f5fafd]' : ''}`}>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[24px] font-bold text-navy">{s.name}</h1>
            {s.own_stock && (
              <span className="rounded-full bg-navy-mid px-2.5 py-0.5 text-[11px] font-bold tracking-[0.04em] text-white uppercase">
                {t.leveranciers.eigenVoorraad}
              </span>
            )}
            {s.container_purchase && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold tracking-[0.04em] text-white uppercase">
                {t.leveranciers.containerinkoop}
              </span>
            )}
          </div>
          {s.container_purchase && <p className="mt-2 text-[13px] text-muted">{t.leveranciers.containerinkoopHint}</p>}
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-soft">
            <span>
              <span className="text-muted">{t.leveranciers.vanuit}: </span>
              <strong className="font-semibold">
                {s.based_in ? landNaam(s.based_in, taal) : t.leveranciers.vanuitOnbekend}
              </strong>
            </span>
            {s.regions.length > 0 && (
              <span>
                <span className="text-muted">{t.leveranciers.actiefIn}: </span>
                <strong className="font-semibold">{s.regions.map((r) => t.labels.regio[r.region]).join(', ')}</strong>
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[12px] text-muted">
            {s.reviewed_at
              ? t.leveranciers.laatstGecontroleerd.replace(
                  '{datum}',
                  new Date(s.reviewed_at).toLocaleDateString(TAAL_OPMAAK[taal], {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }),
                )
              : t.leveranciers.nietGecontroleerd}
          </p>

          {s.regions.map((r) => (
            <RegioBlok key={r.id} gegevens={r} uitleg={uitleg} t={t} />
          ))}

          <hr className="mt-6 mb-1 border-line" />

          <div className="max-w-[860px]">
            {s.details_markdown ? (
              <ArtikelMarkdown>{s.details_markdown}</ArtikelMarkdown>
            ) : (
              <p className="py-4 text-[14px] text-muted">{t.leveranciers.geenDetails}</p>
            )}
          </div>

          {gekoppeld.length > 0 && (
            <div className="mt-4">
              <div className="kb-section-title mb-2">{t.leveranciers.gekoppeldeArtikelen}</div>
              <ul className="grid gap-1.5 text-[14px]">
                {gekoppeld.map((a) => (
                  <li key={a.slug}>
                    <TaalLink
                      href={`/bibliotheek/${a.slug}`}
                      className="text-navy-mid underline underline-offset-2 hover:text-orange"
                    >
                      {a.title}
                    </TaalLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {magBewerken && <BewerkFormulier leverancier={s} taal={taal} t={t} />}
      </main>
    </KbShell>
  );
}

function RegioBlok({
  gegevens: r,
  uitleg,
  t,
}: {
  gegevens: SupplierRegion;
  uitleg: Record<SupplierColumn, KolomUitleg>;
  t: Berichten;
}) {
  return (
    <section className="mt-5">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <h2 className="kb-section-title">{t.labels.regio[r.region]}</h2>
        {r.types.map((tp) => (
          <span key={tp} className="kb-chip border-navy-mid py-0.5 text-[12px] text-navy-mid">
            {t.labels.leverancierstype[tp]}
          </span>
        ))}
      </div>
      {r.notes && <p className="mb-2.5 text-[14px] text-ink-soft">{r.notes}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {SUPPLIER_COLUMNS.map((kolom) => (
          <OnderdeelKaart key={kolom} kolom={kolom} uitleg={uitleg[kolom]} t={t}>
            {kolom === 'carrier' ? (
              <div className="text-[14px] font-semibold text-ink-soft">{r.carrier || '-'}</div>
            ) : (
              <>
                <AutomatiseringBadge status={statusVan(r, kolom)} t={t} />
                {kolom === 'stock_sync' && r.stock_sync_frequency && (
                  <div className="mt-1.5 text-[12px] text-ink-soft">{r.stock_sync_frequency}</div>
                )}
                {kolom === 'stock_sync' && isGemengd(r) && (
                  <div className="mt-1.5 text-[12px] font-medium text-navy-mid">{t.leveranciers.efulfilmentViaPon}</div>
                )}
                <div className="mt-1.5 text-[12px] leading-snug text-muted">
                  {t.leveranciers.legenda[statusVan(r, kolom) ?? 'onbekend']}
                </div>
              </>
            )}
          </OnderdeelKaart>
        ))}
      </div>
    </section>
  );
}

function OnderdeelKaart({
  kolom,
  uitleg,
  t,
  children,
}: {
  kolom: SupplierColumn;
  uitleg: KolomUitleg;
  t: Berichten;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <div className="mb-2">
        <KolomKop kolom={kolom} uitleg={uitleg} t={t} />
      </div>
      {children}
    </div>
  );
}

function BewerkFormulier({ leverancier: s, taal, t }: { leverancier: Supplier; taal: Taal; t: Berichten }) {
  return (
    <details className="kb-card p-4 sm:p-6" open={!s.reviewed_at}>
      <summary className="kb-section-title cursor-pointer">{t.leveranciers.bewerkenTitel}</summary>

      <form action={bewaarLeverancier.bind(null, s.id)} className="mt-4 grid gap-4">
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_220px]">
          <div>
            <label className="kb-label mb-1 block">{t.leveranciers.naam}</label>
            <input name="name" defaultValue={s.name} required className="kb-input" />
          </div>
          <VanuitKeuze waarde={s.based_in} taal={taal} t={t} />
        </div>

        <label className="flex items-start gap-2 text-[13px] text-ink-soft">
          <input type="checkbox" name="own_stock" defaultChecked={s.own_stock} className="mt-0.5 h-3.5 w-3.5" />
          <span>
            <strong className="font-semibold text-navy">{t.leveranciers.eigenVoorraad}</strong>
            {' - '}
            {t.leveranciers.eigenVoorraadHint}
          </span>
        </label>

        <label className="flex items-start gap-2 text-[13px] text-ink-soft">
          <input
            type="checkbox"
            name="container_purchase"
            defaultChecked={s.container_purchase}
            className="mt-0.5 h-3.5 w-3.5"
          />
          <span>
            <strong className="font-semibold text-navy">{t.leveranciers.containerinkoop}</strong>
            {' - '}
            {t.leveranciers.containerinkoopHint}
          </span>
        </label>

        {REGIONS.map((regio) => (
          <RegioVelden key={regio} regio={regio} gegevens={regioVan(s, regio)} t={t} />
        ))}

        <div>
          <label className="kb-label mb-1 block">{t.leveranciers.details}</label>
          <p className="mb-1.5 text-[12px] text-muted">{t.leveranciers.detailsHint}</p>
          <textarea
            name="details_markdown"
            defaultValue={s.details_markdown ?? ''}
            rows={10}
            className="kb-input font-mono text-[13px]"
          />
        </div>

        <div>
          <label className="kb-label mb-1 block">{t.leveranciers.gekoppeldeArtikelen}</label>
          <p className="mb-1.5 text-[12px] text-muted">{t.leveranciers.gekoppeldeArtikelenHint}</p>
          <textarea
            name="related_articles"
            defaultValue={s.related_article_slugs.join('\n')}
            rows={3}
            className="kb-input font-mono text-[13px]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
          <button type="submit" className="kb-btn kb-btn-primary">
            {t.algemeen.opslaan}
          </button>
          <button formAction={verwijderLeverancier.bind(null, s.id)} className="kb-btn border-negative text-negative">
            {t.algemeen.verwijderen}
          </button>
        </div>
      </form>
    </details>
  );
}
