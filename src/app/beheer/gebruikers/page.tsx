import { KbShell } from '@/components/kb-shell';
import { vereisBeheerder } from '@/lib/auth';
import { haalCategorieen } from '@/lib/data';
import { haalAlleCategorieToegang } from '@/lib/toegang';
import { ROLE_LABEL, type UserRole } from '@/lib/types';
import { AanmakenFormulier } from './aanmaken-formulier';
import { bewaarGebruiker } from './acties';

export default async function GebruikersBeheerPagina() {
  const { supabase, user, profiel } = await vereisBeheerder();

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
      <main className="kb-main grid gap-2.5">
        <div>
          <h1 className="kb-page-title">Gebruikers &amp; kennis-toegang</h1>
          <p className="mt-1.5 max-w-[720px] text-[13px] leading-relaxed text-muted">
            Maak accounts aan met een tijdelijk wachtwoord en bepaal per medewerker de rol en welke
            categorieën ze in de AI-assistent en de onboarding-checklist te zien krijgen. &ldquo;Start hier&rdquo;
            is altijd zichtbaar. Vink bij kennis-toegang niets aan voor onbeperkte toegang.
          </p>
        </div>

        <AanmakenFormulier />

        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {(profielen ?? []).map((p) => {
            const huidigeToegang = toegangPerProfiel.get(p.user_id) ?? new Set<string>();
            const isZelf = p.user_id === user.id;
            return (
              <form key={p.user_id} action={bewaarGebruiker.bind(null, p.user_id)} className="kb-card p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[15px] font-semibold text-navy">
                    {p.display_name}
                    {isZelf && <span className="ml-1.5 font-normal text-muted">(jij)</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      name="role"
                      defaultValue={p.role}
                      disabled={isZelf}
                      className="kb-input w-auto py-1.5 text-[13px] disabled:opacity-60"
                    >
                      {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                      <input
                        type="checkbox"
                        name="active"
                        defaultChecked={p.active}
                        disabled={isZelf}
                        className="h-3.5 w-3.5"
                      />
                      Actief
                    </label>
                  </div>
                </div>

                <div className="mt-3.5 flex flex-wrap gap-2.5 border-t border-line pt-3.5">
                  {topCategorieen.map((c) => (
                    <label key={c.id} className="flex items-center gap-1.5 text-[13px] text-ink-soft">
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
                <p className="mt-2 text-[12px] text-muted">
                  Kennis-toegang geldt alleen voor medewerkers en redacteuren — beheerders zien altijd alles.
                </p>

                <button type="submit" disabled={isZelf} className="kb-btn kb-btn-primary mt-4 disabled:opacity-60">
                  Opslaan
                </button>
              </form>
            );
          })}

          {(profielen ?? []).length === 0 && (
            <div className="kb-card kb-empty lg:col-span-2">Nog geen gebruikers gevonden.</div>
          )}
        </div>
      </main>
    </KbShell>
  );
}
