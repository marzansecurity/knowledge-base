import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Slaat "was dit nuttig?" op voor een AI-antwoord. RLS zorgt dat je alleen je eigen berichten kunt markeren. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: 'Niet ingelogd.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const messageId = String(body?.messageId ?? '');
  const helpful = typeof body?.helpful === 'boolean' ? body.helpful : null;
  if (!messageId) return NextResponse.json({ fout: 'Geen bericht opgegeven.' }, { status: 400 });

  const { error } = await supabase
    .from('messages')
    .update({ helpful })
    .eq('id', messageId)
    .eq('role', 'assistant');
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
