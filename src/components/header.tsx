import Image from 'next/image';
import Link from 'next/link';

type Props = {
  titel: string;
  subtitel: string;
  naam?: string;
  rol?: string;
};

export function Header({ titel, subtitel, naam, rol }: Props) {
  return (
    <header className="sticky top-0 z-100 flex h-[70px] items-center gap-5 border-b border-line bg-white px-6 shadow-[0_2px_8px_rgba(0,0,0,.06)]">
      <Link href="/" className="flex items-center gap-3">
        <Image src="/marzan-logo.svg" alt="Marzan Security" width={132} height={52} className="h-[52px] w-auto" priority />
        <span className="h-8 w-px bg-line" />
        <span className="flex flex-col gap-px">
          <span className="text-[17px] font-bold text-navy">{titel}</span>
          <span className="text-[11px] text-muted">{subtitel}</span>
        </span>
      </Link>

      <div className="flex-1" />

      {naam && (
        <div className="flex items-center gap-4">
          <div className="text-right leading-tight">
            <div className="text-[12px] font-semibold text-ink">{naam}</div>
            <div className="text-[11px] text-muted">
              {rol === 'admin' ? 'Beheerder' : 'Medewerker'}
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="kb-btn">
              Uitloggen
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
