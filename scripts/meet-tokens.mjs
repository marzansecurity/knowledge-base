/**
 * Meet met de token-teller van de Anthropic API hoe groot het artikelblok is,
 * en rekent door naar kosten per vraag.
 *
 *   node --env-file=.env.local scripts/meet-tokens.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const RUW = 'import/zoho-ruw';
const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
turndown.use(gfm);

const artikelen = readdirSync(RUW)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(readFileSync(`${RUW}/${f}`, 'utf8')));

const blok = artikelen
  .map((a) => `# ${a.title}\n\n${turndown.turndown(a.answer ?? '').trim()}`)
  .join('\n\n---\n\n');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const model = process.env.ANTHROPIC_MODEL;

const { input_tokens } = await anthropic.messages.countTokens({
  model,
  system: [{ type: 'text', text: blok }],
  messages: [{ role: 'user', content: 'Welke leveranciers sturen automatisch een orderbevestiging?' }],
});

// Sonnet 5: $3 per miljoen input. Cache-schrijven 1 uur = 2x, lezen = 0,1x.
const INPUT = 3.0;
const perVraagWarm = (input_tokens / 1e6) * INPUT * 0.1;
const cacheOpbouw = (input_tokens / 1e6) * INPUT * 2;

console.log(`\nArtikelblok: ${artikelen.length} artikelen`);
console.log(`  ${blok.length.toLocaleString('nl-NL')} tekens`);
console.log(`  ${input_tokens.toLocaleString('nl-NL')} tokens (gemeten door ${model})`);
console.log(`  ${((input_tokens / 1e6) * 100).toFixed(1)}% van een contextvenster van 1 miljoen tokens\n`);
console.log('Kosten per vraag');
console.log(`  cache warm:      $${perVraagWarm.toFixed(4)}`);
console.log(`  cache opbouwen:  $${cacheOpbouw.toFixed(2)}\n`);
