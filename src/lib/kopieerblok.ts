import sanitizeHtml from 'sanitize-html';

/**
 * Een kopieerblok is opmaak die niet in Markdown past, zoals een
 * e-mailhandtekening met kleuren, lettertype en logo. In de Markdown staat het
 * als afgeschermd codeblok met deze taal:
 *
 *   ```html-kopie
 *   <p style="color:#1b5e9e">…</p>
 *   ```
 *
 * In het artikel wordt het getoond zoals het eruitziet, met een knop om het met
 * opmaak te kopiëren (bv. om in Zoho Desk te plakken).
 */
export const KOPIEERBLOK_TAAL = 'html-kopie';

/**
 * Laat alleen opmaak over die in een e-mail thuishoort: geen scripts, geen
 * formulieren, geen event-handlers. Inline stijlen blijven staan, want juist die
 * maken een handtekening.
 */
export function schoonKopieerHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'div', 'span', 'br', 'hr', 'b', 'strong', 'i', 'em', 'u', 's', 'small', 'sub', 'sup', 'font', 'center',
      'a', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'colgroup', 'col',
    ],
    allowedAttributes: {
      '*': ['style', 'align', 'valign', 'width', 'height', 'bgcolor', 'title', 'dir'],
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'border'],
      font: ['color', 'face', 'size'],
      table: ['border', 'cellpadding', 'cellspacing', 'role'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    // Zoho en Word zetten er commentaar en <meta>-regels omheen; die horen er niet bij.
    exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs.src,
  }).trim();
}
