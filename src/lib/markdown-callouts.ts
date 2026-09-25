export const CALLOUT_TYPES = ['TIP', 'INFO', 'WARNING'] as const;
export type CalloutType = (typeof CALLOUT_TYPES)[number];

const CALLOUT_MARKER = /^\[!(TIP|INFO|WARNING)\]\s*/i;

/** Zoekt in de mdast-boom naar blockquotes die beginnen met `[!TIP]`/`[!INFO]`/`[!WARNING]`
 *  en zet die om naar een `<div class="kb-callout kb-callout-...">`, zodat ze net als in
 *  Zoho Desk als gekleurd vak met icoon worden getoond. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // Als lijst, niet als één string: de HTML-filter keurt klassen per stuk goed.
        node.data.hProperties = { className: ['kb-callout', `kb-callout-${type.toLowerCase()}`] };
        // Stond de marker alleen op de eerste regel, dan blijft er een lege alinea over.
        if (!eersteText.value.trim() && eerstePar.children.length === 1) node.children.shift();
      }
    }
  }
}

export function remarkCallouts() {
  return (tree: unknown) => {
    markeerCallouts(tree);
  };
}
