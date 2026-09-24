import type { SupabaseClient } from '@supabase/supabase-js';
import { haalArtikel, haalArtikelLinks } from '@/lib/data';
import { UITLEG_ARTIKEL, UITLEG_PER_KOLOM } from '@/lib/leveranciers';
import { haalSectie } from '@/lib/markdown';
import { STANDAARD_TAAL, type Taal } from '@/lib/talen';
import { SUPPLIER_COLUMNS, type SupplierColumn } from '@/lib/types';

export type KolomUitleg = {
  /** De tekst voor het uitlegvenster, of null als die er (voor deze lezer) niet is. */
  markdown: string | null;
  /** Link naar het hele artikel, of null als dat niet zichtbaar is. */
  artikelHref: string | null;
};

/**
 * Per kolom de uitleg uit het uitlegartikel, voor het venster achter de
 * ⓘ-knop. Eerst in de taal van de lezer; bestaat de kop daar niet (vertaalde
 * koppen heten anders), dan de Nederlandse tekst. Artikelen die de lezer niet
 * mag zien (concepten voor medewerkers) leveren niets op — RLS filtert die.
 */
export async function haalKolomUitleg(
  supabase: SupabaseClient,
  taal: Taal,
): Promise<Record<SupplierColumn, KolomUitleg>> {
  const artikelSlugs = [...new Set(Object.values(UITLEG_PER_KOLOM).map((u) => u.artikel))];
  const [artikel, artikelNl, links] = await Promise.all([
    haalArtikel(supabase, UITLEG_ARTIKEL, taal),
    taal === STANDAARD_TAAL ? Promise.resolve(null) : haalArtikel(supabase, UITLEG_ARTIKEL, STANDAARD_TAAL),
    haalArtikelLinks(supabase, artikelSlugs, taal),
  ]);

  const resultaat = {} as Record<SupplierColumn, KolomUitleg>;
  for (const kolom of SUPPLIER_COLUMNS) {
    const { anker, artikel: doel } = UITLEG_PER_KOLOM[kolom];
    const markdown =
      (artikel && haalSectie(artikel.content_markdown, anker)) ??
      (artikelNl && haalSectie(artikelNl.content_markdown, anker)) ??
      null;
    const link = links.get(doel);
    resultaat[kolom] = {
      markdown,
      artikelHref: link ? `/bibliotheek/${link.slug}` : null,
    };
  }
  return resultaat;
}
