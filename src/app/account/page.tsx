import { KbShell } from '@/components/kb-shell';
import { WachtwoordWijzigen } from '@/components/wachtwoord-wijzigen';
import { TweeFactor } from '@/components/twee-factor';
import { vereisIngelogd } from '@/lib/auth';
import { ROLE_LABEL, type UserRole } from '@/lib/types';

export default async function AccountPagina() {
  const { user, profiel } = await vereisIngelogd();

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid max-w-[640px] gap-2.5">
        <div>
          <h1 className="kb-page-title">Mijn account</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            {user.email} · {profiel?.role ? ROLE_LABEL[profiel.role as UserRole] : ''}
          </p>
        </div>

        <WachtwoordWijzigen />
        <TweeFactor />
      </main>
    </KbShell>
  );
}
