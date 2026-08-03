import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';

/** Rendert artikel-Markdown met dezelfde opmaak als de rest van de app. */
export function ArtikelMarkdown({ children }: { children: string }) {
  return (
    <div className="kb-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
        {children}
      </ReactMarkdown>
    </div>
  );
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
    const id = tekst
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    koppen.push({ niveau, tekst, id });
  }

  return koppen;
}
