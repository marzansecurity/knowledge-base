import { notFound } from 'next/navigation';
import { KbShell } from '@/components/kb-shell';
import { WachtwoordWijzigen } from '@/components/wachtwoord-wijzigen';
import { TweeFactor } from '@/components/twee-factor';
import { vereisIngelogd } from '@/lib/auth';
import { isTaal } from '@/lib/talen';
import { haalVertalingen } from '@/lib/vertalingen';
import type { UserRole } from '@/lib/types';

export default async function AccountPagina({ params }: PageProps<'/[taal]/account'>) {
  const { taal } = await params;
  if (!isTaal(taal)) notFound();
  const t = await haalVertalingen(taal);

  const { user, profiel } = await vereisIngelogd();

  return (
    <KbShell naam={profiel?.display_name ?? undefined} rol={profiel?.role}>
      <main className="kb-main grid max-w-[640px] gap-5">
        <div>
          <h1 className="kb-page-title">{t.navigatie.mijnAccount}</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            {user.email} · {profiel?.role ? t.labels.rol[profiel.role as UserRole] : ''}
          </p>
        </div>

        <WachtwoordWijzigen />
        <TweeFactor />
      </main>
    </KbShell>
  );
}
