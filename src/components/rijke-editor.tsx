'use client';

import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
  type NodeViewProps,
} from '@tiptap/react';
import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { HtmlVoorbeeld } from '@/components/kopieer-blok';
import { useVertalingen } from '@/components/vertaling-provider';
import { EDITOR_EXTENSIES, Kopieerblok } from '@/lib/editor-extensies';
import { schoonKopieerHtml } from '@/lib/kopieerblok';
import { CALLOUT_TYPES, type CalloutType } from '@/lib/markdown-callouts';
import { htmlNaarMarkdown, markdownNaarHtml } from '@/lib/markdown-html';
import type { Berichten } from '@/lib/vertalingen';

export type RijkeEditorHandle = {
  /** De actuele inhoud als Markdown, ook als de laatste wijziging nog niet is doorgegeven. */
  markdown: () => string;
};

const CALLOUT_SLEUTEL: Record<CalloutType, 'calloutTip' | 'calloutInfo' | 'calloutWaarschuwing'> = {
  TIP: 'calloutTip',
  INFO: 'calloutInfo',
  WARNING: 'calloutWaarschuwing',
};

/**
 * Rich-text editor voor artikelen. Laadt Markdown, laat de gebruiker werken
 * zoals in Word of Zoho (vet, lijsten, tabellen, plakken met opmaak), en geeft
 * de inhoud weer als Markdown terug — zie markdown-html.ts voor de omzetting.
 */
export function RijkeEditor({
  markdown,
  onChange,
  uploadAfbeelding,
  ref,
}: {
  markdown: string;
  onChange: (markdown: string) => void;
  /** Uploadt een afbeelding en geeft het pad terug, of null bij een fout. */
  uploadAfbeelding: (bestand: File) => Promise<string | null>;
  ref?: Ref<RijkeEditorHandle>;
}) {
  const { berichten: t } = useVertalingen();
  const laatsteHtml = useRef<string | null>(null);
  const timer = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  const uploadRef = useRef(uploadAfbeelding);
  const editorRef = useRef<Editor | null>(null);
  const [dialoog, setDialoog] = useState<{ html: string; bijwerken: ((html: string) => void) | null } | null>(
    null,
  );

  useEffect(() => {
    onChangeRef.current = onChange;
    uploadRef.current = uploadAfbeelding;
  });

  /** Geeft de laatste wijziging direct door (bij opslaan of wisselen van tabblad). */
  function doorgeven() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (laatsteHtml.current !== null) {
      onChangeRef.current(htmlNaarMarkdown(laatsteHtml.current));
      laatsteHtml.current = null;
    }
  }

  async function plaatsAfbeeldingen(editor: Editor, bestanden: File[], positie?: number) {
    for (const bestand of bestanden) {
      const pad = await uploadRef.current(bestand);
      if (!pad) continue;
      const keten = editor.chain().focus();
      if (positie !== undefined) keten.insertContentAt(positie, { type: 'image', attrs: { src: pad, alt: bestand.name } });
      else keten.setImage({ src: pad, alt: bestand.name });
      keten.run();
    }
  }

  const editor = useEditor({
    // Next rendert eerst op de server; de editor pas in de browser opbouwen.
    immediatelyRender: false,
    extensions: EDITOR_EXTENSIES.map((ext) =>
      ext.name === 'kopieerblok'
        ? Kopieerblok.extend({
            addNodeView() {
              return ReactNodeViewRenderer(KopieerblokWeergave);
            },
          })
        : ext,
    ),
    content: markdownNaarHtml(markdown),
    editorProps: {
      attributes: { class: 'kb-prose kb-editor-inhoud' },
      handlePaste: (_view, event) => {
        const bestanden = Array.from(event.clipboardData?.files ?? []).filter((b) => b.type.startsWith('image/'));
        if (bestanden.length === 0 || !editorRef.current) return false;
        void plaatsAfbeeldingen(editorRef.current, bestanden);
        return true;
      },
      handleDrop: (view, event, _slice, verplaatst) => {
        const bestanden = Array.from(event.dataTransfer?.files ?? []).filter((b) => b.type.startsWith('image/'));
        if (verplaatst || bestanden.length === 0 || !editorRef.current) return false;
        const positie = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void plaatsAfbeeldingen(editorRef.current, bestanden, positie);
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      laatsteHtml.current = e.getHTML();
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(doorgeven, 300);
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Bij wegklikken naar een ander tabblad niets kwijtraken.
  useEffect(() => () => doorgeven(), []);

  useImperativeHandle(ref, () => ({
    markdown: () => {
      doorgeven();
      return editor ? htmlNaarMarkdown(editor.getHTML()) : markdown;
    },
  }));

  // Het kopieerblok in de editor vraagt via een event om het invoegvenster.
  useEffect(() => {
    const open = (e: Event) => setDialoog((e as CustomEvent).detail);
    window.addEventListener('kb-kopieerblok-bewerken', open);
    return () => window.removeEventListener('kb-kopieerblok-bewerken', open);
  }, []);

  if (!editor) return <div className="h-[520px] rounded-md border border-line bg-page" />;

  return (
    <div className="rounded-md border border-line bg-white focus-within:border-teal">
      <Werkbalk
        editor={editor}
        t={t}
        opAfbeelding={(bestand) => void plaatsAfbeeldingen(editor, [bestand])}
        opKopieerblok={() => setDialoog({ html: '', bijwerken: null })}
      />
      <EditorContent editor={editor} />
      {dialoog && (
        <KopieerblokDialoog
          t={t}
          beginHtml={dialoog.html}
          isBijwerken={Boolean(dialoog.bijwerken)}
          onKlaar={(html) => {
            if (dialoog.bijwerken) dialoog.bijwerken(html);
            else {
              // Is er een heel blok geselecteerd (bv. een ander kopieerblok), dan
              // erachter invoegen in plaats van het te vervangen.
              const { selection } = editor.state;
              const blok = { type: 'kopieerblok', attrs: { html } };
              if (selection instanceof NodeSelection) editor.chain().focus().insertContentAt(selection.to, blok).run();
              else editor.chain().focus().insertContent(blok).run();
            }
            setDialoog(null);
          }}
          onAnnuleer={() => setDialoog(null)}
        />
      )}
    </div>
  );
}

// --- Werkbalk ----------------------------------------------------------------

function Knop({
  actief = false,
  titel,
  onClick,
  children,
  uit = false,
}: {
  actief?: boolean;
  titel: string;
  onClick: () => void;
  children: ReactNode;
  uit?: boolean;
}) {
  return (
    <button
      type="button"
      title={titel}
      aria-label={titel}
      aria-pressed={actief}
      disabled={uit}
      // Voorkomt dat de editor de selectie verliest bij het klikken.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded px-2 text-[13px] transition-colors disabled:opacity-40 ${
        actief ? 'bg-navy text-white' : 'text-ink-soft hover:bg-page'
      }`}
    >
      {children}
    </button>
  );
}

const Scheiding = () => <span className="mx-1 h-5 w-px bg-line" />;

function Werkbalk({
  editor,
  t,
  opAfbeelding,
  opKopieerblok,
}: {
  editor: Editor;
  t: Berichten;
  opAfbeelding: (bestand: File) => void;
  opKopieerblok: () => void;
}) {
  const bestandRef = useRef<HTMLInputElement>(null);
  const staat = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      vet: e.isActive('bold'),
      schuin: e.isActive('italic'),
      onderstreept: e.isActive('underline'),
      kop2: e.isActive('heading', { level: 2 }),
      kop3: e.isActive('heading', { level: 3 }),
      opsomming: e.isActive('bulletList'),
      nummering: e.isActive('orderedList'),
      taken: e.isActive('taskList'),
      link: e.isActive('link'),
      inTabel: e.isActive('table'),
      callout: CALLOUT_TYPES.find((type) => e.isActive('callout', { type })) ?? null,
      kanOngedaan: e.can().undo(),
      kanOpnieuw: e.can().redo(),
    }),
  });
  const k = () => editor.chain().focus();

  function zetLink() {
    const huidig = (editor.getAttributes('link').href as string | undefined) ?? '';
    const adres = window.prompt(t.editor.linkVraag, huidig);
    if (adres === null) return;
    if (adres.trim() === '') k().extendMarkRange('link').unsetLink().run();
    else k().extendMarkRange('link').setLink({ href: adres.trim() }).run();
  }

  function zetCallout(type: CalloutType) {
    if (staat.callout === type) k().lift('callout').run();
    else if (staat.callout) k().updateAttributes('callout', { type }).run();
    else k().wrapIn('callout', { type }).run();
  }

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-md border-b border-line bg-white px-2 py-1.5">
      <Knop titel={t.editor.werkbalkVet} actief={staat.vet} onClick={() => k().toggleBold().run()}>
        <strong>B</strong>
      </Knop>
      <Knop titel={t.editor.werkbalkSchuin} actief={staat.schuin} onClick={() => k().toggleItalic().run()}>
        <em className="font-serif">I</em>
      </Knop>
      <Knop titel={t.editor.werkbalkOnderstreept} actief={staat.onderstreept} onClick={() => k().toggleUnderline().run()}>
        <u>U</u>
      </Knop>
      <Scheiding />
      <Knop titel={t.editor.werkbalkKop} actief={staat.kop2} onClick={() => k().toggleHeading({ level: 2 }).run()}>
        H2
      </Knop>
      <Knop titel={t.editor.werkbalkSubkop} actief={staat.kop3} onClick={() => k().toggleHeading({ level: 3 }).run()}>
        H3
      </Knop>
      <Scheiding />
      <Knop titel={t.editor.werkbalkOpsomming} actief={staat.opsomming} onClick={() => k().toggleBulletList().run()}>
        • ≡
      </Knop>
      <Knop titel={t.editor.werkbalkNummering} actief={staat.nummering} onClick={() => k().toggleOrderedList().run()}>
        1.≡
      </Knop>
      <Knop titel={t.editor.werkbalkTaken} actief={staat.taken} onClick={() => k().toggleTaskList().run()}>
        ☑
      </Knop>
      <Scheiding />
      <Knop titel={t.editor.werkbalkLink} actief={staat.link} onClick={zetLink}>
        🔗
      </Knop>
      <Knop titel={t.editor.werkbalkAfbeelding} onClick={() => bestandRef.current?.click()}>
        🖼️
      </Knop>
      <input
        ref={bestandRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const bestand = e.target.files?.[0];
          e.target.value = '';
          if (bestand) opAfbeelding(bestand);
        }}
      />
      <Knop
        titel={t.editor.werkbalkTabel}
        actief={staat.inTabel}
        onClick={() => k().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        ▦
      </Knop>
      <Scheiding />
      {CALLOUT_TYPES.map((type) => (
        <Knop key={type} titel={t.editor[CALLOUT_SLEUTEL[type]]} actief={staat.callout === type} onClick={() => zetCallout(type)}>
          {t.editor[CALLOUT_SLEUTEL[type]]}
        </Knop>
      ))}
      <Knop titel={t.editor.kopieerblokUitlegKort} onClick={opKopieerblok}>
        {t.editor.kopieerblok}
      </Knop>
      <Scheiding />
      <Knop titel={t.editor.werkbalkOngedaan} uit={!staat.kanOngedaan} onClick={() => k().undo().run()}>
        ↶
      </Knop>
      <Knop titel={t.editor.werkbalkOpnieuw} uit={!staat.kanOpnieuw} onClick={() => k().redo().run()}>
        ↷
      </Knop>

      {staat.inTabel && (
        <div className="flex w-full flex-wrap items-center gap-0.5 border-t border-line pt-1">
          <span className="kb-label mr-1">{t.editor.werkbalkTabel}</span>
          <Knop titel={t.editor.tabelRijErbij} onClick={() => k().addRowAfter().run()}>
            {t.editor.tabelRijErbij}
          </Knop>
          <Knop titel={t.editor.tabelKolomErbij} onClick={() => k().addColumnAfter().run()}>
            {t.editor.tabelKolomErbij}
          </Knop>
          <Knop titel={t.editor.tabelRijWeg} onClick={() => k().deleteRow().run()}>
            {t.editor.tabelRijWeg}
          </Knop>
          <Knop titel={t.editor.tabelKolomWeg} onClick={() => k().deleteColumn().run()}>
            {t.editor.tabelKolomWeg}
          </Knop>
          <Knop titel={t.editor.tabelWeg} onClick={() => k().deleteTable().run()}>
            {t.editor.tabelWeg}
          </Knop>
        </div>
      )}
    </div>
  );
}

// --- Kopieerblok -------------------------------------------------------------

/** Zo staat een kopieerblok in de editor: een voorbeeld met knoppen. */
function KopieerblokWeergave({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { berichten: t } = useVertalingen();
  const html = String(node.attrs.html ?? '');
  return (
    <NodeViewWrapper
      className={`my-4 overflow-hidden rounded-lg border ${selected ? 'border-teal ring-2 ring-teal/30' : 'border-line'}`}
      contentEditable={false}
      data-drag-handle
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-page px-3 py-1.5">
        <span className="kb-label">{t.editor.kopieerblokLabel}</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            className="kb-btn px-2.5 py-1 text-[12px]"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent('kb-kopieerblok-bewerken', {
                  detail: { html, bijwerken: (nieuw: string) => updateAttributes({ html: nieuw }) },
                }),
              )
            }
          >
            {t.editor.kopieerblokBewerken}
          </button>
          <button type="button" className="kb-btn px-2.5 py-1 text-[12px] text-negative" onClick={deleteNode}>
            {t.editor.kopieerblokVerwijderen}
          </button>
        </div>
      </div>
      <HtmlVoorbeeld html={schoonKopieerHtml(html)} titel={t.editor.kopieerblokLabel} />
    </NodeViewWrapper>
  );
}

/** Venster om opmaak te plakken (bv. een handtekening uit Zoho) en als kopieerblok in te voegen. */
function KopieerblokDialoog({
  t,
  beginHtml,
  isBijwerken,
  onKlaar,
  onAnnuleer,
}: {
  t: Berichten;
  beginHtml: string;
  isBijwerken: boolean;
  onKlaar: (html: string) => void;
  onAnnuleer: () => void;
}) {
  const venster = useRef<HTMLDialogElement>(null);
  const [html, setHtml] = useState(beginHtml);
  const schoon = schoonKopieerHtml(html);

  useEffect(() => {
    venster.current?.showModal();
  }, []);

  function opPlakken(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const rijk = e.clipboardData.getData('text/html');
    if (rijk) {
      // Alleen wat tussen de fragmentmarkeringen van Windows staat, als die er zijn.
      const fragment = rijk.match(/<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/)?.[1] ?? rijk;
      setHtml(schoonKopieerHtml(fragment));
    } else {
      const tekst = e.clipboardData.getData('text/plain');
      const veilig = tekst.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      setHtml(veilig.split(/\r?\n/).join('<br>'));
    }
  }

  return (
    <dialog
      ref={venster}
      onCancel={onAnnuleer}
      className="m-auto w-[calc(100%-32px)] max-w-[760px] rounded-xl border border-line p-0 text-ink-soft shadow-xl backdrop:bg-[#10395b]/40"
    >
      <div className="flex max-h-[85vh] flex-col">
        <div className="border-b border-line px-5 py-3.5">
          <h2 className="text-[17px] font-bold text-navy">{t.editor.kopieerblokTitel}</h2>
          <p className="mt-1 text-[13px] text-muted">{t.editor.kopieerblokUitleg}</p>
        </div>

        <div className="grid gap-3 overflow-y-auto px-5 py-4">
          <div
            contentEditable
            suppressContentEditableWarning
            onPaste={opPlakken}
            onKeyDown={(e) => {
              // Alleen plakken; typen hoort in de HTML-code eronder.
              if (!(e.ctrlKey || e.metaKey) && e.key.length === 1) e.preventDefault();
            }}
            className="rounded-md border-2 border-dashed border-line bg-page px-4 py-5 text-center text-[14px] text-muted outline-none focus:border-teal focus:bg-white"
          >
            {t.editor.kopieerblokPlakHier}
          </div>

          <div>
            <div className="kb-label mb-1">{t.editor.kopieerblokVoorbeeld}</div>
            <div className="overflow-hidden rounded-md border border-line">
              {schoon ? (
                <HtmlVoorbeeld html={schoon} titel={t.editor.kopieerblokVoorbeeld} />
              ) : (
                <p className="px-3 py-4 text-[13px] text-muted">{t.editor.kopieerblokLeeg}</p>
              )}
            </div>
            {/<img/i.test(schoon) && <p className="mt-1.5 text-[12px] text-[#8a4a12]">{t.editor.logoWaarschuwing}</p>}
          </div>

          <details>
            <summary className="cursor-pointer text-[13px] text-navy-mid">{t.editor.kopieerblokHtmlCode}</summary>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={8}
              spellCheck={false}
              className="kb-input mt-2 font-mono text-[12px]"
            />
          </details>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <button type="button" className="kb-btn" onClick={onAnnuleer}>
            {t.algemeen.annuleren}
          </button>
          <button type="button" className="kb-btn kb-btn-primary" disabled={!schoon} onClick={() => onKlaar(schoon)}>
            {isBijwerken ? t.editor.kopieerblokBijwerken : t.editor.kopieerblokInvoegen}
          </button>
        </div>
      </div>
    </dialog>
  );
}
