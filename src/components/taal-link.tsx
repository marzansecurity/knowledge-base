'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { pad, taalUitPad } from '@/lib/paden';
import { useTaal } from '@/components/vertaling-provider';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };

/**
 * Zoals next/link, maar zet de huidige taal voor het pad. Interne paden schrijf
 * je dus gewoon taalloos: <TaalLink href="/bibliotheek">.
 *
 * Ongemoeid blijven: externe links (http…, mailto:), paden die de taal al
 * bevatten, en de taalloze routes /api en /auth — precies de paden die ook
 * buiten de matcher van src/proxy.ts vallen.
 */
const TAALLOZE_PADEN = ['/api/', '/auth/'];

export function TaalLink({ href, ...rest }: Props) {
  const taal = useTaal();
  const isIntern = href.startsWith('/');
  const isTaalloos = TAALLOZE_PADEN.some((p) => href.startsWith(p));
  const heeftTaal = isIntern && taalUitPad(href) !== null;
  const doel = isIntern && !isTaalloos && !heeftTaal ? pad(taal, href) : href;

  return <Link href={doel} {...rest} />;
}
