import { KbShell } from '@/components/kb-shell';
import { vereisBeheerder } from '@/lib/auth';
import { haalCategorieen } from '@/lib/data';
import { haalAlleCategorieToegang } from '@/lib/toegang';
import { USER_ROLES } from '@/lib/types';
import { notFound } from 'next/navigation';
import { isTaal } from '@/lib/talen';
import { haalVertalingen } from '@/lib/vertalingen';
import { AanmakenFormulier } from './aanmaken-formulier';
import { bewaarGebruiker } from './acties';

export default async function GebruikersBeheerPagina({ params }: PageProps<'/[taal]/beheer/gebruikers'>) {
  const { taal } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);
  const { supabase, user, profiel } = await vereisBeheerder();

  const [{ data: profielen }, categorieen, toegangPerProfiel] = await Promise.all([
    supabase
      .from('profiles')
      .select('user_id, display_name, role, active')
      .order('display_name'),
    haalCategorieen(supabase, taal),
    haalAlleCategorieToegang(supabase),
  ]);

  const topCategorieen = categorieen
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid gap-5">
        <div>
          <h1 className="kb-page-title">{t.beheer.gebruikers.titel}</h1>
          <p className="mt-1.5 max-w-[720px] text-[13px] leading-relaxed text-muted">
            {t.beheer.gebruikers.inleiding}
          </p>
        </div>

        <AanmakenFormulier />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {(profielen ?? []).map((p) => {
            const huidigeToegang = toegangPerProfiel.get(p.user_id) ?? new Set<string>();
            const isZelf = p.user_id === user.id;
            return (
              <form key={p.user_id} action={bewaarGebruiker.bind(null, p.user_id)} className="kb-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[15px] font-semibold text-navy">
                    {p.display_name}
                    {isZelf && (
                      <span className="ml-1.5 font-normal text-muted">{t.beheer.gebruikers.jij}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      name="role"
                      defaultValue={p.role}
                      disabled={isZelf}
                      className="kb-input w-auto py-1.5 text-[13px] disabled:opacity-60"
                    >
                      {USER_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {t.labels.rol[r]}
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
                      {t.beheer.gebruikers.actief}
                    </label>
                  </div>
                </div>

                <div className="mt-3.5 flex flex-wrap gap-3.5 border-t border-line pt-3.5">
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
                <p className="mt-2 text-[12px] text-muted">{t.beheer.gebruikers.toegangToelichting}</p>

                <button type="submit" disabled={isZelf} className="kb-btn kb-btn-primary mt-4 disabled:opacity-60">
                  {t.algemeen.opslaan}
                </button>
              </form>
            );
          })}

          {(profielen ?? []).length === 0 && (
            <div className="kb-card kb-empty lg:col-span-2">{t.beheer.gebruikers.geenGebruikers}</div>
          )}
        </div>
      </main>
    </KbShell>
  );
}
