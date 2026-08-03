import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'artikel-afbeeldingen';

/**
 * Levert een afbeelding uit de private Storage-bucket, maar alleen aan een
 * ingelogde gebruiker. De bucket zelf blijft afgeschermd.
 */
export async function GET(_request: Request, context: { params: Promise<{ pad: string[] }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Niet ingelogd', { status: 401 });
  }

  const { pad } = await context.params;
  const bestandspad = pad.join('/');

  // Geen padtraversal buiten de bucket om.
  if (bestandspad.includes('..')) {
    return new NextResponse('Ongeldig pad', { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).download(bestandspad);

  if (error || !data) {
    return new NextResponse('Afbeelding niet gevonden', { status: 404 });
  }

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      'Content-Type': data.type || 'image/png',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
