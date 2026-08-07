import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIEKE_PADEN = ['/login', '/auth'];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Ververst de sessie; niet weglaten.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pad = request.nextUrl.pathname;
  const isPubliek = PUBLIEKE_PADEN.some((p) => pad.startsWith(p));

  if (!user && !isPubliek) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('volgende', pad);
    return NextResponse.redirect(url);
  }

  if (user && !isPubliek) {
    // Heeft de gebruiker 2FA ingesteld, maar deze sessie nog niet geverifieerd?
    // Dan mag niets anders dan de verificatiepagina geladen worden.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
      const url = request.nextUrl.clone();
      url.pathname = '/login/verificeren';
      url.searchParams.set('volgende', pad);
      return NextResponse.redirect(url);
    }
  }

  if (user && pad === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
