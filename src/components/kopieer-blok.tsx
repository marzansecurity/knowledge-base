'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { useVertalingen } from '@/components/vertaling-provider';

/**
 * Toont HTML precies zoals die eruitziet, in een iframe zodat de stijlen van de
 * kennisbank er niet doorheen lopen. Zonder scripts; same-origin alleen zodat de
 * hoogte gemeten en de inhoud gekopieerd kan worden. De html moet al door
 * schoonKopieerHtml() zijn gegaan.
 */
export function HtmlVoorbeeld({
  html,
  titel,
  ref,
}: {
  html: string;
  titel: string;
  ref?: RefObject<HTMLIFrameElement | null>;
}) {
  const eigen = useRef<HTMLIFrameElement>(null);
  const venster = ref ?? eigen;
  const [hoogte, setHoogte] = useState(80);

  const inhoud = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:12px;font-family:Arial,Helvetica,sans-serif;font-size:14px}</style></head><body>${html}</body></html>`;

  function meetHoogte() {
    const body = venster.current?.contentDocument?.body;
    if (body) setHoogte(Math.min(Math.max(body.scrollHeight + 24, 60), 800));
  }

  // Een iframe uit de serverweergave kan al geladen zijn voordat React er een
  // onLoad aan hangt; dan hier alsnog meten.
  useEffect(() => {
    if (venster.current?.contentDocument?.readyState === 'complete') meetHoogte();
  });

  return (
    <iframe
      ref={venster}
      srcDoc={inhoud}
      onLoad={meetHoogte}
      sandbox="allow-same-origin"
      title={titel}
      className="block w-full bg-white"
      style={{ height: hoogte }}
    />
  );
}

/**
 * Een kopieerblok zoals medewerkers het in een artikel zien: de opmaak
 * (bv. een e-mailhandtekening) met een knop die de HTML mét opmaak naar het
 * klembord kopieert, om in Zoho Desk of een mail te plakken.
 */
export function KopieerBlok({ html }: { html: string }) {
  const { berichten: t } = useVertalingen();
  const venster = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<'rust' | 'gekopieerd' | 'mislukt'>('rust');

  async function kopieer() {
    const tekst = venster.current?.contentDocument?.body.innerText ?? '';
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([tekst], { type: 'text/plain' }),
        }),
      ]);
      setStatus('gekopieerd');
    } catch {
      // Oudere browsers of geen toestemming: de inhoud van het venster selecteren
      // en de klassieke kopieeropdracht gebruiken; dat neemt de opmaak ook mee.
      const doc = venster.current?.contentDocument;
      const selectie = doc?.getSelection();
      if (doc && selectie) {
        const bereik = doc.createRange();
        bereik.selectNodeContents(doc.body);
        selectie.removeAllRanges();
        selectie.addRange(bereik);
        const gelukt = doc.execCommand('copy');
        selectie.removeAllRanges();
        setStatus(gelukt ? 'gekopieerd' : 'mislukt');
      } else {
        setStatus('mislukt');
      }
    }
    window.setTimeout(() => setStatus('rust'), 2500);
  }

  return (
    <div className="kb-kopieerblok my-4 overflow-hidden rounded-lg border border-line">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-page px-3 py-2">
        <span className="kb-label">{t.artikel.kopieerblokLabel}</span>
        <button type="button" onClick={kopieer} className="kb-btn kb-btn-primary px-3 py-1 text-[13px]">
          {status === 'gekopieerd' ? t.artikel.gekopieerd : t.artikel.kopieerMetOpmaak}
        </button>
      </div>
      {status === 'mislukt' && (
        <p className="border-b border-line bg-[#fdf0ef] px-3 py-1.5 text-[12px] text-negative">
          {t.artikel.kopierenMislukt}
        </p>
      )}
      <HtmlVoorbeeld html={html} titel={t.artikel.kopieerblokLabel} ref={venster} />
    </div>
  );
}
