import { cookies } from 'next/headers';
import { isTaal, STANDAARD_TAAL, TAAL_COOKIE, type Taal } from '@/lib/talen';

/**
 * De huidige taal, gelezen uit de cookie die src/proxy.ts zet.
 *
 * Bedoeld voor plekken die geen route-params hebben — server actions en
 * route handlers vooral. Heeft een pagina de taal al uit `params`, gebruik die
 * dan: dat is de bron van waarheid, deze cookie is de terugval.
 */
export async function huidigeTaal(): Promise<Taal> {
  const cookieStore = await cookies();
  const waarde = cookieStore.get(TAAL_COOKIE)?.value;
  return isTaal(waarde) ? waarde : STANDAARD_TAAL;
}
