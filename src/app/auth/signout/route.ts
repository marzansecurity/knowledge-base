import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isTaal, STANDAARD_TAAL, TAAL_COOKIE } from '@/lib/talen';

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Deze route valt buiten de proxy-matcher en heeft dus geen taal in het pad;
  // de cookie is hier de enige bron van de taalkeuze.
  const cookieStore = await cookies();
  const uitCookie = cookieStore.get(TAAL_COOKIE)?.value;
  const taal = isTaal(uitCookie) ? uitCookie : STANDAARD_TAAL;

  return NextResponse.redirect(new URL(`/${taal}/login`, request.url), { status: 303 });
}
