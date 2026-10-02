/**
 * Zet alle regeleinden om naar gewone (\n). Een formulier dat via een server
 * action wordt verstuurd (multipart) maakt van elke regeleinde een Windows-
 * regeleinde (\r\n), dus tekst die zo is opgeslagen wijkt letterlijk af van de
 * tekst in de editor, ook als er inhoudelijk niets is veranderd.
 */
export function normaliseerRegeleinden(tekst: string): string {
  return tekst.replace(/\r\n?/g, '\n');
}
