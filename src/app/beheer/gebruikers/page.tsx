import { KbShell } from '@/components/kb-shell';
import { vereisBeheerder } from '@/lib/auth';
import { haalCategorieen } from '@/lib/data';
import { haalAlleCategorieToegang } from '@/lib/toegang';
import { bewaarToegang } from './acties';

export default async function GebruikersBeheerPagina() {
  const { supabase, profiel } = await vereisBeheerder();

  const [{ data: profielen }, categorieen, toegangPerProfiel] = await Promise.all([
    supabase
      .from('profiles')
      .select('user_id, display_name, role, active')
      .order('display_name'),
    haalCategorieen(supabase),
    haalAlleCategorieToegang(supabase),
  ]);

  const topCategorieen = categorieen
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="mx-auto grid max-w-[900px] gap-4 px-6 py-8">
        <div>
          <h1 className="text-[20px] font-bold text-navy">Kennis-toegang per medewerker</h1>
          <p className="mt-1 text-[13px] text-muted">
            Bepaal welke categorieën een medewerker in de AI-assistent en de onboarding-checklist te zien
            krijgt. &ldquo;Start hier&rdquo; is altijd zichtbaar. Vink niets aan voor onbeperkte toegang (het huidige
            gedrag voor iedereen zonder instelling hier).
          </p>
        </div>

        <div className="grid gap-3">
          {(profielen ?? [])
            .filter((p) => p.role !== 'admin')
            .map((p) => {
              const huidigeToegang = toegangPerProfiel.get(p.user_id) ?? new Set<string>();
              return (
                <form
                  key={p.user_id}
                  action={bewaarToegang.bind(null, p.user_id)}
                  className="kb-card p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[15px] font-semibold text-navy">{p.display_name}</div>
                    {!p.active && <span className="kb-chip">Inactief</span>}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3">
                    {topCategorieen.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-1.5 text-[13px] text-ink-soft"
                      >
                        <input
                          type="checkbox"
                          name="category_ids"
                          value={c.id}
                          defaultChecked={c.slug === 'start-hier' || huidigeToegang.has(c.id)}
                          disabled={c.slug === 'start-hier'}
                          className="h-3.5 w-3.5"
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>

                  <button type="submit" className="kb-btn kb-btn-primary mt-3">
                    Opslaan
                  </button>
                </form>
              );
            })}

          {(profielen ?? []).filter((p) => p.role !== 'admin').length === 0 && (
            <div className="kb-empty">Nog geen medewerkers om toegang voor in te stellen.</div>
          )}
        </div>
      </main>
    </KbShell>
  );
}
