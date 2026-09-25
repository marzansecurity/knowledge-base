import type { Element } from 'hast';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { KopieerBlok } from '@/components/kopieer-blok';
import { KOPIEERBLOK_TAAL, schoonKopieerHtml } from '@/lib/kopieerblok';
import { remarkCallouts } from '@/lib/markdown-callouts';

export { CALLOUT_TYPES, type CalloutType } from '@/lib/markdown-callouts';

/**
 * Wat er aan HTML in een artikel mag staan. Losse HTML (zoals <u> voor
 * onderstreept, uit de editor) wordt doorgelaten, maar gefilterd: het schema van
 * GitHub, plus onderstrepen en de klassen van de gekleurde vakken.
 */
const SCHEMA = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u'],
  attributes: {
    ...defaultSchema.attributes,
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      ['className', 'kb-callout', 'kb-callout-tip', 'kb-callout-info', 'kb-callout-warning'],
    ],
  },
};

const KOPIEERBLOK_KLASSE = `language-${KOPIEERBLOK_TAAL}`;

/** Een ```html-kopie-blok wordt geen codeblok maar een kopieerblok met knop. */
const COMPONENTEN: Components = {
  pre({ node, children, ...rest }) {
    const code = node?.children[0] as Element | undefined;
    const klassen = code?.properties?.className;
    if (code?.tagName === 'code' && Array.isArray(klassen) && klassen.includes(KOPIEERBLOK_KLASSE)) {
      const tekst = code.children.map((k) => (k.type === 'text' ? k.value : '')).join('');
      return <KopieerBlok html={schoonKopieerHtml(tekst)} />;
    }
    return <pre {...rest}>{children}</pre>;
  },
};

/** Rendert artikel-Markdown met dezelfde opmaak als de rest van de app. */
export function ArtikelMarkdown({ children }: { children: string }) {
  return (
    <div className="kb-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkCallouts]}
        // Eerst de losse HTML inlezen, dan filteren, en pas daarna de koppen een
        // id geven: anders zet de filter er "user-content-" voor en werken de
        // ankerlinks van de inhoudsopgave niet meer.
        rehypePlugins={[rehypeRaw, [rehypeSanitize, SCHEMA], rehypeSlug]}
        components={COMPONENTEN}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function kopId(tekst: string) {
  return tekst
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Haalt de koppen (h2/h3) uit Markdown voor de inhoudsopgave. */
export function haalKoppenOp(markdown: string) {
  const regels = markdown.split('\n');
  const koppen: { niveau: 2 | 3; tekst: string; id: string }[] = [];

  for (const regel of regels) {
    const match = regel.match(/^(#{2,3})\s+(.*)$/);
    if (!match) continue;
    const niveau = match[1].length === 2 ? 2 : 3;
    const tekst = match[2].trim();
    koppen.push({ niveau, tekst, id: kopId(tekst) });
  }

  return koppen;
}

/**
 * De tekst onder één kop (h2/h3), tot de volgende kop van hetzelfde of een
 * hoger niveau. Null als de kop niet bestaat — bv. in een vertaling, waar de
 * koppen anders heten.
 */
export function haalSectie(markdown: string, id: string): string | null {
  const regels = markdown.split(/\r?\n/);
  const start = regels.findIndex((r) => {
    const m = r.match(/^(#{2,3})\s+(.*)$/);
    return m !== null && kopId(m[2].trim()) === id;
  });
  if (start === -1) return null;

  const niveau = regels[start].match(/^#+/)![0].length;
  let eind = regels.length;
  for (let i = start + 1; i < regels.length; i += 1) {
    const m = regels[i].match(/^(#{1,6})\s/);
    if (m && m[1].length <= niveau) {
      eind = i;
      break;
    }
  }

  const sectie = regels
    .slice(start + 1, eind)
    .join('\n')
    .replace(/(\n\s*---\s*)+$/, '')
    .trim();
  return sectie || null;
}
