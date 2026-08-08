'use client';

import { createContext, useContext } from 'react';
import type { Taal } from '@/lib/talen';
import type { Berichten } from '@/lib/vertalingen';

type Waarde = { taal: Taal; berichten: Berichten };

const VertalingContext = createContext<Waarde | null>(null);

/**
 * Zet taal en berichten klaar voor clientcomponenten. Wordt één keer gerenderd
 * in src/app/[taal]/layout.tsx; het hele woordenboek reist dan mee in de
 * RSC-payload (een paar kilobyte).
 *
 * Servercomponenten gebruiken dit niet — die roepen haalVertalingen(taal) aan.
 */
export function VertalingProvider({
  taal,
  berichten,
  children,
}: Waarde & { children: React.ReactNode }) {
  return (
    <VertalingContext.Provider value={{ taal, berichten }}>{children}</VertalingContext.Provider>
  );
}

export function useVertalingen(): Waarde {
  const waarde = useContext(VertalingContext);
  if (!waarde) {
    throw new Error('useVertalingen moet binnen een VertalingProvider gebruikt worden.');
  }
  return waarde;
}

/** Kortere variant voor als je alleen de huidige taal nodig hebt. */
export function useTaal(): Taal {
  return useVertalingen().taal;
}
