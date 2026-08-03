import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { bouwExportBestanden } from '@/lib/export';
import { maakZip } from '@/lib/zip';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: 'Niet ingelogd.' }, { status: 401 });

  const { data: profiel } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profiel?.role !== 'admin') {
    return NextResponse.json({ fout: 'Alleen beheerders kunnen exporteren.' }, { status: 403 });
  }

  const bestanden = await bouwExportBestanden(supabase);
  const zip = maakZip(bestanden);

  const datum = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="marzan-kennisbank-export-${datum}.zip"`,
      'Content-Length': String(zip.length),
    },
  });
}
