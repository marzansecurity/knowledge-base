import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { AutomatiseringBadge } from '@/components/automatisering-badge';
import { KbShell } from '@/components/kb-shell';
import { LandEnTypeVinkjes } from '@/components/leverancier-velden';
import { TaalLink } from '@/components/taal-link';
import { vereisIngelogd } from '@/lib/auth';
import { haalArtikelLinks, haalLeverancier } from '@/lib/data';
import { statusVan, UITLEG_PER_KOLOM } from '@/lib/leveranciers';
import { ArtikelMarkdown } from '@/lib/markdown';
import { isTaal, STANDAARD_TAAL, TAAL_OPMAAK } from '@/lib/talen';
import { haalVertalingen, type Berichten } from '@/lib/vertalingen';
import { AUTOMATION_STATUSES, SUPPLIER_STEPS, type Supplier } from '@/lib/types';
import { bewaarLeverancier, verwijderLeverancier } from '../acties';

export default async function LeverancierPagina({ params }: PageProps<'/[taal]/leveranciers/[slug]'>) {
  const { taal, slug } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);

  const { supabase, profiel } = await vereisIngelogd();
  const magBewerken = profiel?.role === 'admin' || profiel?.role === 'editor';

  const s = await haalLeverancier(supabase, slug);
  if (!s) notFound();

  const uitlegSlugs = Object.values(UITLEG_PER_KOLOM).map((u) => u.slug);
  const artikelLinks = await haalArtikelLinks(supabase, [...new Set([...uitlegSlugs, ...s.related_article_slugs])], taal);

  const uitlegHref = (kolom: keyof typeof UITLEG_PER_KOLOM) => {
    const { slug: artikelSlug, anker } = UITLEG_PER_KOLOM[kolom];
    const artikel = artikelLinks.get(artikelSlug);
    if (!artikel) return undefined;
    return `/bibliotheek/${artikel.slug}${anker && taal === STANDAARD_TAAL ? `#${anker}` : ''}`;
  };

  const gekoppeld = s.related_article_slugs
    .map((artikelSlug) => artikelLinks.get(artikelSlug))
    .filter((a): a is { slug: string; title: string } => Boolean(a));

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-5">
        <TaalLink href="/leveranciers" className="text-[13px] text-muted hover:text-navy">
          {t.leveranciers.terugNaarOverzicht}
        </TaalLink>

        <div className="kb-card p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-[24px] font-bold text-navy">{s.name}</h1>
            <div className="flex flex-wrap gap-1.5">
              {s.countries.map((c) => (
                <span key={c} className="kb-chip py-0.5 text-[12px]">
                  {t.labels.land[c]}
                </span>
              ))}
              {s.types.map((tp) => (
                <span key={tp} className="kb-chip border-navy-mid py-0.5 text-[12px] text-navy-mid">
                  {t.labels.leverancierstype[tp]}
                </span>
              ))}
            </div>
          </div>
          {s.notes && <p className="mt-2 text-[14px] text-ink-soft">{s.notes}</p>}
          <p className="mt-2 text-[12px] text-muted">
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

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {SUPPLIER_STEPS.map((stap) => {
              const status = statusVan(s, stap);
              return (
                <OnderdeelKaart key={stap} label={t.leveranciers.onderdeel[stap]} href={uitlegHref(stap)} t={t}>
                  <AutomatiseringBadge status={status} t={t} />
                  {stap === 'stock_sync' && s.stock_sync_frequency && (
                    <div className="mt-1.5 text-[12px] text-ink-soft">{s.stock_sync_frequency}</div>
                  )}
                  <div className="mt-1.5 text-[12px] leading-snug text-muted">
                    {t.leveranciers.legenda[status ?? 'onbekend']}
                  </div>
                </OnderdeelKaart>
              );
            })}
            <OnderdeelKaart label={t.leveranciers.vervoerder} href={uitlegHref('carrier')} t={t}>
              <div className="text-[14px] font-semibold text-ink-soft">{s.carrier || '—'}</div>
            </OnderdeelKaart>
          </div>

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
                    <TaalLink href={`/bibliotheek/${a.slug}`} className="text-navy-mid underline underline-offset-2 hover:text-orange">
                      {a.title}
                    </TaalLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {magBewerken && <BewerkFormulier leverancier={s} t={t} />}
      </main>
    </KbShell>
  );
}

function OnderdeelKaart({
  label,
  href,
  t,
  children,
}: {
  label: string;
  href?: string;
  t: Berichten;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="mb-2">
        {href ? (
          <TaalLink href={href} title={t.leveranciers.watIsDit} className="kb-label text-navy-mid hover:text-orange">
            {label} ?
          </TaalLink>
        ) : (
          <span className="kb-label">{label}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function BewerkFormulier({ leverancier: s, t }: { leverancier: Supplier; t: Berichten }) {
  return (
    <details className="kb-card p-4 sm:p-6" open={!s.reviewed_at}>
      <summary className="kb-section-title cursor-pointer">{t.leveranciers.bewerkenTitel}</summary>

      <form action={bewaarLeverancier.bind(null, s.id)} className="mt-4 grid gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <label className="kb-label mb-1 block">{t.leveranciers.naam}</label>
            <input name="name" defaultValue={s.name} required className="kb-input" />
          </div>
          <LandEnTypeVinkjes t={t} landen={s.countries} types={s.types} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SUPPLIER_STEPS.map((stap) => (
            <div key={stap}>
              <label className="kb-label mb-1 block">{t.leveranciers.onderdeel[stap]}</label>
              <select name={`${stap}_status`} defaultValue={statusVan(s, stap) ?? ''} className="kb-input">
                <option value="">
                  {t.labels.automatisering.onbekend} — {t.leveranciers.legenda.onbekend}
                </option>
                {AUTOMATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t.labels.automatisering[status]} — {t.leveranciers.legenda[status]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="kb-label mb-1 block">{t.leveranciers.frequentie}</label>
            <input
              name="stock_sync_frequency"
              defaultValue={s.stock_sync_frequency ?? ''}
              className="kb-input"
              placeholder={t.leveranciers.frequentiePlaceholder}
            />
          </div>
          <div>
            <label className="kb-label mb-1 block">{t.leveranciers.vervoerder}</label>
            <input
              name="carrier"
              defaultValue={s.carrier ?? ''}
              className="kb-input"
              placeholder={t.leveranciers.vervoerderPlaceholder}
            />
          </div>
        </div>

        <div>
          <label className="kb-label mb-1 block">{t.leveranciers.opmerkingen}</label>
          <input
            name="notes"
            defaultValue={s.notes ?? ''}
            className="kb-input"
            placeholder={t.leveranciers.opmerkingenPlaceholder}
          />
        </div>

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
