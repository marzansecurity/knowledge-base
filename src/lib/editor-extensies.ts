import { mergeAttributes, Node, type Extensions } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import StarterKit from '@tiptap/starter-kit';
import { KOPIEERBLOK_TAAL } from '@/lib/kopieerblok';

/*
 * De bouwstenen van de artikel-editor, los van React, zodat dezelfde set ook
 * buiten de browser gebruikt kan worden (bv. om de omzetting te testen). De
 * weergave van het kopieerblok in de editor (NodeView) voegt rijke-editor.tsx toe.
 */

/** Gekleurd vak: tip, info of waarschuwing. Zelfde klassen als in de weergave. */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'INFO',
        parseHTML: (el) => (el.className.match(/kb-callout-(tip|info|warning)/)?.[1] ?? 'info').toUpperCase(),
        renderHTML: (attrs) => ({ class: `kb-callout kb-callout-${String(attrs.type).toLowerCase()}` }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div.kb-callout' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', HTMLAttributes, 0];
  },
});

/** Opmaak die exact bewaard moet blijven, zoals een e-mailhandtekening. */
export const Kopieerblok = Node.create({
  name: 'kopieerblok',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      html: {
        default: '',
        parseHTML: (el) =>
          el.nodeName === 'PRE' ? (el.querySelector('code')?.textContent ?? '') : (el.getAttribute('data-html') ?? ''),
        renderHTML: (attrs) => ({ 'data-html': attrs.html }),
      },
    };
  },

  parseHTML() {
    return [
      // Vóór het gewone codeblok (prioriteit 50), anders wordt het daar een van.
      {
        tag: 'pre',
        priority: 100,
        getAttrs: (el) => ((el as HTMLElement).querySelector(`code.language-${KOPIEERBLOK_TAAL}`) ? null : false),
      },
      { tag: 'div[data-kopieerblok]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-kopieerblok': '' })];
  },
});

export const EDITOR_EXTENSIES: Extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4] },
    link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: null, target: null } },
  }),
  // Inline, zoals in Markdown: een afbeelding midden in een zin blijft daar staan.
  Image.configure({ inline: true, allowBase64: false }),
  TaskList,
  TaskItem.configure({ nested: true }),
  TableKit.configure({ table: { resizable: false } }),
  Callout,
  Kopieerblok,
];
