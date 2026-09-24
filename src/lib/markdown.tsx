import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';

export const CALLOUT_TYPES = ['TIP', 'INFO', 'WARNING'] as const;
export type CalloutType = (typeof CALLOUT_TYPES)[number];

const CALLOUT_MARKER = /^\[!(TIP|INFO|WARNING)\]\s*/i;

/** Zoekt in de mdast-boom naar blockquotes die beginnen met `[!TIP]`/`[!INFO]`/`[!WARNING]`
 *  en zet die om naar een `<div class="kb-callout kb-callout-...">`, zodat ze net als in
 *  Zoho Desk als gekleurd vak met icoon worden getoond. */
function markeerCallouts(node: any) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.children)) {
    for (const kind of node.children) markeerCallouts(kind);
  }
  if (node.type === 'blockquote') {
    const eerstePar = node.children?.[0];
    const eersteText = eerstePar?.type === 'paragraph' ? eerstePar.children?.[0] : null;
    if (eersteText?.type === 'text') {
      const match = eersteText.value.match(CALLOUT_MARKER);
      if (match) {
        eersteText.value = eersteText.value.slice(match[0].length);
        const type = match[1].toUpperCase() as CalloutType;
        node.data = node.data ?? {};
        node.data.hName = 'div';
        node.data.hProperties = { className: `kb-callout kb-callout-${type.toLowerCase()}` };
      }
    }
  }
}

function remarkCallouts() {
  return (tree: unknown) => {
    markeerCallouts(tree);
  };
}

/** Rendert artikel-Markdown met dezelfde opmaak als de rest van de app. */
export function ArtikelMarkdown({ children }: { children: string }) {
  return (
    <div className="kb-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkCallouts]} rehypePlugins={[rehypeSlug]}>
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
