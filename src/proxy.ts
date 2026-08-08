import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isTaal, TAAL_COOKIE, TAAL_COOKIE_MAXAGE, type Taal } from '@/lib/talen';
import { taalUitHeader } from '@/lib/paden';

// Paden binnen een taalsegment die zonder sessie bereikbaar zijn.
const PUBLIEKE_SUBPADEN = ['/login'];

const COOKIE_OPTIES = {
  path: '/',
  maxAge: TAAL_COOKIE_MAXAGE,
  sameSite: 'lax',
} as const;

/** Eerdere keuze wint van de browservoorkeur; anders het Nederlands. */
function kiesTaal(request: NextRequest): Taal {
  const uitCookie = request.cookies.get(TAAL_COOKIE)?.value;
  if (isTaal(uitCookie)) return uitCookie;
  return taalUitHeader(request.headers.get('accept-language'));
}

export async function proxy(request: NextRequest) {
  const pad = request.nextUrl.pathname;

  // 1. Taalprefix afdwingen, vóór alle auth-logica. Zonder geldig taalsegment
  //    bestaat de route niet, dus doorsturen heeft altijd voorrang.
  const eersteSegment = pad.split('/')[1];
  if (!isTaal(eersteSegment)) {
    const taal = kiesTaal(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${taal}${pad === '/' ? '' : pad}`;
    const omleiding = NextResponse.redirect(url);
    omleiding.cookies.set(TAAL_COOKIE, taal, COOKIE_OPTIES);
    return omleiding;
  }

  const taal = eersteSegment;
  // Pad zonder taal, zodat de regels hieronder taal-onafhankelijk blijven.
  const restPad = pad.slice(`/${taal}`.length) || '/';

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

  const isPubliek = PUBLIEKE_SUBPADEN.some((p) => restPad === p || restPad.startsWith(`${p}/`));

  if (!user && !isPubliek) {
    const url = request.nextUrl.clone();
    url.pathname = `/${taal}/login`;
    // Taalloos bewaren: de loginpagina plakt de taal er zelf weer voor.
    url.searchParams.set('volgende', restPad);
    return NextResponse.redirect(url);
  }

  if (user && !isPubliek) {
    // Heeft de gebruiker 2FA ingesteld, maar deze sessie nog niet geverifieerd?
    // Dan mag niets anders dan de verificatiepagina geladen worden.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
      const url = request.nextUrl.clone();
      url.pathname = `/${taal}/login/verificeren`;
      url.searchParams.set('volgende', restPad);
      return NextResponse.redirect(url);
    }
  }

  if (user && restPad === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = `/${taal}`;
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Taal uit de URL vastleggen, zodat een latere kale / meteen goed landt.
  if (request.cookies.get(TAAL_COOKIE)?.value !== taal) {
    response.cookies.set(TAAL_COOKIE, taal, COOKIE_OPTIES);
  }

  return response;
}

export const config = {
  // api en auth moeten hier buiten blijven: anders zou stap 1 /api/assistent
  // naar /nl/api/assistent sturen en volgt een 404.
  matcher: [
    '/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
