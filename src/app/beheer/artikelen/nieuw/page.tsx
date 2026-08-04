import { KbShell } from '@/components/kb-shell';
import { vereisBeheerder } from '@/lib/auth';
import { maakArtikel } from '@/app/beheer/artikelen/acties';

export default async function NieuwArtikelPagina() {
  const { profiel } = await vereisBeheerder();

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="mx-auto max-w-lg px-6 py-[18px]">
        <form action={maakArtikel} className="kb-card space-y-4 p-6">
          <div>
            <label htmlFor="title" className="kb-label mb-1.5 block">
              Titel
            </label>
            <input
              id="title"
              name="title"
              required
              autoFocus
              className="kb-input"
              placeholder="Bijvoorbeeld: Retourneren van een bestelling"
            />
          </div>
          <button type="submit" className="kb-btn kb-btn-primary w-full py-2">
            Artikel aanmaken als concept
          </button>
          <p className="text-[11px] leading-relaxed text-muted">
            Je komt hierna direct in de editor terecht. Publiceren doe je apart, zodra de inhoud klaar is.
          </p>
        </form>
      </main>
    </KbShell>
  );
}
