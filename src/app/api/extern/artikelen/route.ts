import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Lees-API voor het Marzan CRM (AI-laag, 21-11-2026). Het CRM neemt de
 * kennisbank over in een eigen tabel, zodat de AI in tickets er concepten met
 * bronvermelding op kan baseren (besluit Martijn: "artikelen overnemen in het
 * CRM").
 *
 * - Alleen lezen, met een eigen token: `Authorization: Bearer <CRM_LEES_TOKEN>`.
 *   Zonder token in de omgeving staat de route dicht.
 * - Geeft elk artikel dat sinds `?sinds=` (ISO) is bijgewerkt, met status, zodat
 *   het CRM een niet meer gepubliceerd artikel kan uitzetten. Zonder `sinds`
 *   alles. Per pagina 100, `?pagina=` vanaf 0.
 * - Met de vertalingen (nl/en/fr) en de categorienaam. Geen afbeeldingen: die
 *   staan achter de login van deze app.
 */

export const dynamic = 'force-dynamic';

const PER_PAGINA = 100;

function tokenOk(request: NextRequest): boolean {
  const verwacht = process.env.CRM_LEES_TOKEN;
  const kop = request.headers.get('authorization') ?? '';
  if (!verwacht || !kop.startsWith('Bearer ')) return false;
  const a = Buffer.from(kop.slice(7));
  const b = Buffer.from(verwacht);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!tokenOk(request)) return NextResponse.json({ fout: 'Niet toegestaan.' }, { status: 401 });

  const sinds = request.nextUrl.searchParams.get('sinds');
  const pagina = Math.max(0, Number(request.nextUrl.searchParams.get('pagina') ?? 0) || 0);
  if (sinds && Number.isNaN(Date.parse(sinds))) {
    return NextResponse.json({ fout: 'Ongeldige datum in sinds.' }, { status: 400 });
  }

  let query = createAdminClient()
    .from('articles')
    .select(
      'id, slug, title, summary, content_markdown, status, type, countries, channel, updated_at, categories(name), article_translations(locale, title, summary, content_markdown, review_state, stale, updated_at)',
    )
    .order('updated_at', { ascending: true })
    .order('id', { ascending: true })
    .range(pagina * PER_PAGINA, pagina * PER_PAGINA + PER_PAGINA - 1);
  if (sinds) query = query.gte('updated_at', sinds);

  const { data, error } = await query;
  if (error) {
    console.error('[extern/artikelen]', error.message);
    return NextResponse.json({ fout: 'Ophalen mislukt.' }, { status: 500 });
  }

  const artikelen = (data ?? []).map((a) => {
    const categorie = a.categories as unknown as { name: string } | { name: string }[] | null;
    return {
      id: a.id,
      slug: a.slug,
      titel: a.title,
      samenvatting: a.summary,
      inhoud: a.content_markdown,
      status: a.status,
      soort: a.type,
      landen: a.countries ?? [],
      kanaal: a.channel,
      categorie: Array.isArray(categorie) ? (categorie[0]?.name ?? null) : (categorie?.name ?? null),
      bijgewerkt_op: a.updated_at,
      vertalingen: ((a.article_translations ?? []) as {
        locale: string;
        title: string;
        summary: string | null;
        content_markdown: string;
        review_state: string;
        stale: boolean;
        updated_at: string;
      }[]).map((v) => ({
        taal: v.locale,
        titel: v.title,
        samenvatting: v.summary,
        inhoud: v.content_markdown,
        nagekeken: v.review_state === 'nagekeken',
        verouderd: v.stale,
        bijgewerkt_op: v.updated_at,
      })),
    };
  });

  return NextResponse.json({
    artikelen,
    volgende_pagina: artikelen.length === PER_PAGINA ? pagina + 1 : null,
  });
}
