'use client';

import Image from 'next/image';
import { TaalLink } from '@/components/taal-link';
import { Taalwissel } from '@/components/taalwissel';
import { useVertalingen } from '@/components/vertaling-provider';
import { usePathname } from 'next/navigation';
import { useState, type ComponentType, type SVGProps } from 'react';
import { zonderTaal } from '@/lib/paden';
import type { Berichten } from '@/lib/vertalingen';
import type { UserRole } from '@/lib/types';

type IconProps = SVGProps<SVGSVGElement>;

function IconDashboard(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="11" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconBook(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M3 4.5c0-.83.67-1.5 1.5-1.5H9v13H4.5A1.5 1.5 0 0 1 3 14.5v-10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M17 4.5c0-.83-.67-1.5-1.5-1.5H11v13h4.5a1.5 1.5 0 0 0 1.5-1.5v-10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChat(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v5A2.5 2.5 0 0 1 14.5 13H9l-4 3v-3H5.5A2.5 2.5 0 0 1 3 10.5v-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChecklist(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="m3.5 6 1.5 1.5L7.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m3.5 12 1.5 1.5 2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 6h6M10.5 12.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconTruck(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="1.5" y="6" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 8.5h3.5l2.5 2.5v2h-6v-4.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="5" cy="14.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="14.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconMenu(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconClose(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="10" cy="10" r="2.75" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.36 4.64l-1.42 1.42M6.06 13.94l-1.42 1.42M15.36 15.36l-1.42-1.42M6.06 6.06 4.64 4.64"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
  exact?: boolean;
};

function navItems(isBeheerder: boolean, t: Berichten): NavItem[] {
  return [
    { href: '/', label: t.navigatie.dashboard, icon: IconDashboard, exact: true },
    { href: '/bibliotheek', label: t.navigatie.bibliotheek, icon: IconBook },
    { href: '/leveranciers', label: t.navigatie.leveranciers, icon: IconTruck },
    { href: '/assistent', label: t.navigatie.assistent, icon: IconChat },
    { href: '/onboarding', label: t.navigatie.onboarding, icon: IconChecklist },
    ...(isBeheerder ? [{ href: '/beheer', label: t.navigatie.beheer, icon: IconSettings }] : []),
  ];
}

type Props = {
  naam?: string;
  rol?: UserRole;
};

function NavLinks({
  isBeheerder,
  pathname,
  onNavigeer,
}: {
  isBeheerder: boolean;
  pathname: string;
  onNavigeer?: () => void;
}) {
  const { berichten: t } = useVertalingen();
  // De hrefs hierboven zijn taalloos; het pad uit de router is dat niet.
  const huidigPad = zonderTaal(pathname);

  return (
    <nav className="flex-1 space-y-1 px-3">
      {navItems(isBeheerder, t).map(({ href, label, icon: Icon, exact }) => {
        const actief = exact
          ? huidigPad === href
          : huidigPad === href || huidigPad.startsWith(`${href}/`);
        return (
          <TaalLink
            key={href}
            href={href}
            onClick={onNavigeer}
            className={`flex items-center gap-3 rounded-md px-3 py-3 text-[14px] font-medium transition-colors ${
              actief ? 'bg-orange text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </TaalLink>
        );
      })}
    </nav>
  );
}

function AccountVoetnoot({ naam, rol }: Props) {
  const { berichten: t } = useVertalingen();

  // De taalkiezer hoort er ook te staan als er (nog) geen profiel bekend is.
  return (
    <div className="border-t border-white/10 px-4 py-4">
      {naam && (
        <>
          <div className="truncate text-[14px] font-semibold text-white">{naam}</div>
          <div className="text-[12px] text-white/50">{rol ? t.labels.rol[rol] : ''}</div>
          <TaalLink
            href="/account"
            className="mt-2.5 block w-full rounded-md border border-white/15 px-3 py-1.5 text-center text-[12px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            {t.navigatie.mijnAccount}
          </TaalLink>
          <form action="/auth/signout" method="post" className="mt-1.5">
            <button
              type="submit"
              className="w-full rounded-md border border-white/15 px-3 py-1.5 text-[12px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              {t.navigatie.uitloggen}
            </button>
          </form>
        </>
      )}
      <Taalwissel className={naam ? 'mt-3' : undefined} />
    </div>
  );
}

export function Sidebar({ naam, rol }: Props) {
  const { berichten: t } = useVertalingen();
  const pathname = usePathname();
  const magBeheerMenuZien = rol === 'admin' || rol === 'editor';
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobiele topbalk: vervangt de vaste zijbalk op smalle schermen. */}
      <div className="bg-navy-deep sticky top-0 z-40 flex items-center justify-between px-4 py-3 md:hidden">
        <TaalLink href="/" className="flex items-center gap-2.5">
          <span className="inline-flex w-fit rounded-md bg-white px-2 py-1.5 shadow-sm">
            <Image src="/marzan-logo.svg" alt="Marzan Security" width={132} height={52} className="h-5 w-auto" />
          </span>
          <span className="text-[11px] font-bold tracking-[0.1em] text-white/70 uppercase">
            {t.navigatie.kennisbank}
          </span>
        </TaalLink>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.navigatie.menuOpenen}
          className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white"
        >
          <IconMenu className="h-6 w-6" />
        </button>
      </div>

      {/* Overlay + uitklapmenu, alleen op smalle schermen. */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="bg-navy-deep absolute top-0 left-0 flex h-full w-[280px] max-w-[80vw] flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-6">
              <span className="inline-flex w-fit rounded-lg bg-white px-3 py-2 shadow-sm">
                <Image src="/marzan-logo.svg" alt="Marzan Security" width={132} height={52} className="h-7 w-auto" />
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.navigatie.menuSluiten}
                className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>
            <NavLinks isBeheerder={magBeheerMenuZien} pathname={pathname} onNavigeer={() => setOpen(false)} />
            <AccountVoetnoot naam={naam} rol={rol} />
          </aside>
        </div>
      )}

      {/* Vaste zijbalk op middelgrote en grote schermen. */}
      <aside className="bg-navy-deep sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col md:flex">
        <TaalLink href="/" className="flex flex-col gap-2.5 px-5 py-6">
          <span className="inline-flex w-fit rounded-lg bg-white px-3 py-2 shadow-sm">
            <Image src="/marzan-logo.svg" alt="Marzan Security" width={132} height={52} className="h-7 w-auto" priority />
          </span>
          <span className="text-[12px] font-bold tracking-[0.1em] text-white/70 uppercase">
            {t.navigatie.kennisbank}
          </span>
        </TaalLink>

        <NavLinks isBeheerder={magBeheerMenuZien} pathname={pathname} />
        <AccountVoetnoot naam={naam} rol={rol} />
      </aside>
    </>
  );
}
