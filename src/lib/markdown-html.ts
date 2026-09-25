import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { unified } from 'unified';
import { KOPIEERBLOK_TAAL } from '@/lib/kopieerblok';
import { remarkCallouts } from '@/lib/markdown-callouts';

/*
 * Artikelen worden als Markdown opgeslagen: daar draaien zoeken, de
 * AI-assistent, de vertalingen en de importscripts op. De rich-text editor
 * werkt met HTML. Deze twee functies zetten het ene om in het andere, met
 * dezelfde afspraken als de weergave:
 *
 *   - gekleurde vakken:  > [!TIP] / [!INFO] / [!WARNING]  <->  <div class="kb-callout …">
 *   - kopieerblokken:    ```html-kopie                      <->  <div data-kopieerblok data-html="…">
 *   - onderstrepen:      <u>…</u> (Markdown kent geen onderstrepen)
 */

/**
 * Afvinklijstjes (`- [ ] …`) zet remark-gfm om naar <li class="task-list-item">
 * met een <input>. De editor herkent alleen zijn eigen vorm
 * (<li data-type="taskItem" data-checked>), dus die zetten we hier om.
 */
function rehypeTakenlijst() {
  const klassenVan = (node: HastKnoop) => {
    const klassen = node.properties?.className;
    return Array.isArray(klassen) ? (klassen as string[]) : [];
  };
  const isTaak = (node: HastKnoop) => node.type === 'element' && klassenVan(node).includes('task-list-item');

  /** Haalt het vinkje uit een item; bij een ruime lijst zit het in de eerste alinea. */
  const haalVinkje = (li: HastKnoop) => {
    const houder = li.children?.find((k) => k.type === 'element' && k.tagName === 'p') ?? li;
    const vinkje = houder.children?.find((k) => k.type === 'element' && k.tagName === 'input');
    houder.children = (houder.children ?? []).filter((k) => k !== vinkje);
    return { houder, aan: Boolean(vinkje?.properties?.checked) };
  };

  const bezoek = (node: HastKnoop) => {
    if (node.type === 'element' && node.tagName === 'ul' && klassenVan(node).includes('contains-task-list')) {
      const items = (node.children ?? []).filter((k) => k.type === 'element' && k.tagName === 'li');
      if (items.every(isTaak)) {
        node.properties = { dataType: 'taskList' };
        for (const li of items) {
          const { aan } = haalVinkje(li);
          li.properties = { dataType: 'taskItem', dataChecked: aan ? 'true' : 'false' };
        }
      } else {
        // Gemengde lijst (gewone punten én vinkjes): de editor kent dat niet.
        // Een gewone lijst houden en het vinkje als teken in de tekst zetten.
        node.properties = {};
        for (const li of items.filter(isTaak)) {
          const { houder, aan } = haalVinkje(li);
          houder.children = [{ type: 'text', value: aan ? '☑ ' : '☐ ' }, ...(houder.children ?? [])];
          li.properties = {};
        }
      }
    }
    for (const kind of node.children ?? []) bezoek(kind);
  };
  return (boom: unknown) => bezoek(boom as HastKnoop);
}

type HastKnoop = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastKnoop[];
};

/** Markdown → HTML om in de editor te laden. */
export function markdownNaarHtml(markdown: string): string {
  return String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkCallouts)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeTakenlijst)
      .use(rehypeStringify)
      .processSync(markdown),
  );
}

let omzetter: TurndownService | null = null;

/** Een kopieerblok als afgeschermd codeblok, of niets als het leeg is. */
function kopieerblokNaarMarkdown(node: Node): string {
  const html = ((node as HTMLElement).getAttribute('data-html') ?? '').trim();
  return html ? `\n\n\`\`\`${KOPIEERBLOK_TAAL}\n${html}\n\`\`\`\n\n` : '';
}

const isKopieerblok = (node: Node) =>
  node.nodeName === 'DIV' && (node as HTMLElement).hasAttribute('data-kopieerblok');

function maakOmzetter() {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
    hr: '---',
    // Turndown behandelt elementen zonder tekst als leeg, nog vóór de eigen regels.
    blankReplacement: (_inhoud, node) => {
      const naam = node.nodeName;
      // Een kopieerblok heeft in de editor geen tekst (de HTML zit in een
      // attribuut): zonder deze uitzondering zou het bij opslaan verdwijnen.
      if (isKopieerblok(node)) return kopieerblokNaarMarkdown(node);
      // Een lege tabelcel mag geen witregel worden: dan breekt de hele tabel.
      if (naam === 'TD' || naam === 'TH') {
        const index = Array.prototype.indexOf.call(node.parentNode?.childNodes ?? [], node);
        return `${index === 0 ? '| ' : ' '} |`;
      }
      if (naam === 'P' && ['TD', 'TH'].includes(node.parentNode?.nodeName ?? '')) return '';
      return (node as { isBlock?: boolean }).isBlock ? '\n\n' : '';
    },
  });
  td.use(gfm);
  // Markdown kent geen onderstrepen: dat blijft als HTML staan, en de weergave laat het door.
  td.keep(['u']);

  // Vet of schuin direct tegen een woord aan, met leestekens aan de binnenkant
  // (bv. "product***(aantal)***"): dat herkent Markdown niet als opmaak. Dan de
  // HTML-tag gebruiken; de weergave laat die door, en de inhoud blijft Markdown.
  for (const [naam, tags, teken] of [
    ['vetTegenWoord', ['STRONG', 'B'], 'strong'],
    ['schuinTegenWoord', ['EM', 'I'], 'em'],
  ] as const) {
    td.addRule(naam, {
      filter: (node) => {
        if (!(tags as readonly string[]).includes(node.nodeName)) return false;
        const tekst = node.textContent ?? '';
        const voor = node.previousSibling?.textContent?.slice(-1) ?? '';
        const na = node.nextSibling?.textContent?.charAt(0) ?? '';
        const woord = /[\p{L}\p{N}]/u;
        const leesteken = /[\p{P}\p{S}]/u;
        return (
          (woord.test(voor) && leesteken.test(tekst.charAt(0))) ||
          (woord.test(na) && leesteken.test(tekst.slice(-1)))
        );
      },
      replacement: (inhoud) => (inhoud.trim() ? `<${teken}>${inhoud}</${teken}>` : ''),
    });
  }

  // Regels die met addRule worden toegevoegd gaan vóór de standaardregels.
  td.addRule('kopieerblok', {
    filter: isKopieerblok,
    replacement: (_inhoud, node) => kopieerblokNaarMarkdown(node),
  });

  td.addRule('callout', {
    filter: (node) => node.nodeName === 'DIV' && (node as HTMLElement).classList.contains('kb-callout'),
    replacement: (inhoud, node) => {
      const soort = ((node as HTMLElement).className.match(/kb-callout-(tip|info|warning)/)?.[1] ?? 'info').toUpperCase();
      const regels = inhoud.trim().split('\n');
      // De marker hoort op dezelfde regel als de eerste zin; begint het vak met
      // een lijst of kop, dan op een eigen regel, anders breekt die.
      if (/^(\s*[-*+]\s|\s*\d+\.\s|#|\|)/.test(regels[0] ?? '')) regels.unshift(`[!${soort}]`);
      else regels[0] = `[!${soort}] ${regels[0] ?? ''}`;
      return `\n\n${regels.map((r) => (r ? `> ${r}` : '>')).join('\n')}\n\n`;
    },
  });

  // In een tabelcel mag geen witregel staan, anders breekt de tabel.
  td.addRule('alineaInCel', {
    filter: (node) => node.nodeName === 'P' && ['TD', 'TH'].includes(node.parentNode?.nodeName ?? ''),
    replacement: (inhoud, node) => (node.nextSibling ? `${inhoud.trim()}<br>` : inhoud.trim()),
  });

  // Een lijstitem met één alinea: geen witregels, dan blijft de lijst compact.
  td.addRule('alineaInLijst', {
    filter: (node) =>
      node.nodeName === 'P' &&
      node.parentNode?.nodeName === 'LI' &&
      Array.from(node.parentNode.childNodes).filter((k) => k.nodeName === 'P').length === 1,
    replacement: (inhoud) => inhoud,
  });

  // "- tekst" in plaats van turndowns standaard "-   tekst".
  td.addRule('lijstItem', {
    filter: 'li',
    replacement: (inhoud, node, opties) => {
      const ouder = node.parentNode as HTMLElement | null;
      let prefix = `${opties.bulletListMarker} `;
      if (ouder?.nodeName === 'OL') {
        const start = Number(ouder.getAttribute('start') ?? '1') || 1;
        prefix = `${start + Array.prototype.indexOf.call(ouder.children, node)}. `;
      }
      const tekst = inhoud
        .replace(/^\n+/, '')
        .replace(/\n+$/, '\n')
        .replace(/\n/gm, `\n${' '.repeat(prefix.length)}`);
      return prefix + tekst + (node.nextSibling && !/\n$/.test(tekst) ? '\n' : '');
    },
  });

  // Afvinklijstje van de editor: <li data-checked><label><input></label><div>…</div></li>.
  td.addRule('vinkjeLabel', {
    filter: (node) => node.nodeName === 'LABEL' && (node.parentNode as HTMLElement | null)?.hasAttribute?.('data-checked') === true,
    replacement: () => '',
  });
  td.addRule('taakItem', {
    filter: (node) => node.nodeName === 'LI' && (node as HTMLElement).hasAttribute('data-checked'),
    replacement: (inhoud, node) => {
      const aan = (node as HTMLElement).getAttribute('data-checked') === 'true';
      const prefix = `- [${aan ? 'x' : ' '}] `;
      const tekst = inhoud.replace(/^\n+/, '').replace(/\n+$/, '\n').replace(/\n/gm, '\n  ');
      return prefix + tekst + (node.nextSibling && !/\n$/.test(tekst) ? '\n' : '');
    },
  });

  return td;
}

/** HTML uit de editor → Markdown om op te slaan. */
export function htmlNaarMarkdown(html: string): string {
  omzetter ??= maakOmzetter();
  // De editor zet kolombreedtes in tabellen (<colgroup>, style). Die kent
  // Markdown niet, en ze zitten de herkenning van de kopregel in de weg: dan
  // blijft de hele tabel als HTML staan in plaats van een Markdown-tabel.
  const schoon = html
    .replace(/<colgroup>[\s\S]*?<\/colgroup>/g, '')
    .replace(/<table style="[^"]*"/g, '<table');
  return (
    omzetter
      .turndown(schoon)
      // Regels met alleen spaties (van lege alinea's in een lijst) weg, en meer
      // dan één witregel achter elkaar voegt niets toe.
      .replace(/^[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}
