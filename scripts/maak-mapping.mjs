/**
 * Stelt per Zoho-artikel een nieuwe categorie en tags voor en schrijft het
 * resultaat weg als CSV (om na te lopen) en JSON (voor het importscript).
 *
 *   node scripts/maak-mapping.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

// --- Doelcategorieën --------------------------------------------------------

const CATEGORIEEN = {
  'start-hier': 'Start hier',
  orderverwerking: 'Orderverwerking',
  'verzending-magazijnen': 'Verzending & Magazijnen',
  'installatie-services': 'Installatie & Services',
  'betalen-administratie': 'Betalen & Administratie',
  'retour-klachten': 'Retour & Klachten',
  kluisproblemen: 'Kluisproblemen',
  'b2b-accounts': 'B2B Accounts',
  'toeleveranciers-partners': 'Toeleveranciers & Partners',
  // Voorstel: tiende categorie, zie het reviewrapport.
  'verkoop-productadvies': 'Verkoop & Productadvies',
};

// Standaardbestemming per Zoho-categorie.
const STANDAARD = {
  'Introductie nieuwe agents': 'start-hier',
  Bestellen: 'orderverwerking',
  'Procedures / werkwijzes': 'orderverwerking',
  Administratie: 'betalen-administratie',
  Betalen: 'betalen-administratie',
  Toeleveranciers: 'toeleveranciers-partners',
  'Kluis niet open / dicht': 'kluisproblemen',
  'Schade / Defect': 'retour-klachten',
  Retourneren: 'retour-klachten',
  Advies: 'verkoop-productadvies',
  'Instructies B2B accounts': 'b2b-accounts',
  Verzending: 'verzending-magazijnen',
  Diversen: 'orderverwerking',
};

// Uitzonderingen op de standaard, op exacte titel.
const UITZONDERINGEN = {
  // → Verzending & Magazijnen
  'PON procedures': 'verzending-magazijnen',
  'Orders opnieuw aanbieden PON': 'verzending-magazijnen',
  'Efulfilment / e-warehouse': 'verzending-magazijnen',
  'Claim indienen bij e-warehouse': 'verzending-magazijnen',
  'Track en Trace wordt niet automatisch weergegeven in order': 'verzending-magazijnen',
  'Tracking link Transmission': 'verzending-magazijnen',
  'Inboeken verzending Magento (track&trace, POD, e.d.)': 'verzending-magazijnen',
  'Verzendmethode aanpassen in Magento': 'verzending-magazijnen',
  'Voorraad Breda toevoegen': 'verzending-magazijnen',
  'Levertijden & levering op specifieke dag': 'verzending-magazijnen',
  'Is zaterdag levering mogelijk?': 'verzending-magazijnen',
  'Wat zijn de verzendkosten?': 'verzending-magazijnen',
  'Kluis afhalen': 'verzending-magazijnen',
  'Afhaler Gunnebo invullen': 'verzending-magazijnen',
  'Klant informeren levertijd (proactief)': 'verzending-magazijnen',
  'Waar blijft mijn bestelling / service?': 'verzending-magazijnen',

  // → Installatie & Services
  'Trap 1 - rechte trap': 'installatie-services',
  'Trap 2 - rechte trap met bordes': 'installatie-services',
  'Trap 3 - rechte trap met klein bordes': 'installatie-services',
  'Trap 4 - rechte trap met 1 knik': 'installatie-services',
  'Trap 5  - rechte trap met 2 bordessen': 'installatie-services',
  'Trap 6  - rechte trap met knik bovenaan': 'installatie-services',
  'Trap 7 - draaitrap 180 graden': 'installatie-services',
  'Trap 8 - wenteltrap': 'installatie-services',
  'Installatie van kluizen, brandkasten': 'installatie-services',
  'Installatie uitvragen geen gehoor': 'installatie-services',
  'Installatie aftersales geen gehoor': 'installatie-services',
  'Achterwand verankering niet doorgeboord': 'installatie-services',
  'Nieuwe verankeraar VGW': 'installatie-services',
  'Opvolging installatie kluizen': 'installatie-services',
  'Opvolging installatie-orders — stap voor stap': 'installatie-services',
  'Opname (site survey) aanmaken en versturen - installatie voorbereiden | handleiding medewerkers':
    'installatie-services',
  'Werkbonnen beheren - aanmaken, team toewijzen, vrijgeven en verzenden | handleiding back office':
    'installatie-services',
  'Managing work orders - create, assign a team, release and send | back office guide':
    'installatie-services',
  'Welke service mag ik verwachten bij aflevering van een kluis?': 'installatie-services',
  'Wat te doen bij aanvraag afvoer of verhuis kluis?': 'installatie-services',
  'Opvolging aanvraag afvoer of verhuis kluis': 'installatie-services',
  'Dank voor bestelling + installatie': 'installatie-services',

  // → Kluisproblemen
  'Mijn kluis gaat niet open - GEEN klant': 'kluisproblemen',
  'Mijn kluis gaat niet open - klant': 'kluisproblemen',
  'Info oude LIPS kluis, geen toegang archieven': 'kluisproblemen',
  'Verdere opvolging After Sales Support, kluis gaat niet open, e.d.': 'kluisproblemen',
  'Orderverwerking kluis openen, inkoopdracht verstrekken aan toeleverancier': 'kluisproblemen',
  'Opvolging sleutels dupliceren': 'kluisproblemen',

  // → Retour & Klachten
  'Afhandelen retour': 'retour-klachten',
  'Ruilprogramma Puck Keysafe': 'retour-klachten',
  'Vervangen/retourneren Puck': 'retour-klachten',
  'Klachtprocedure Masterlock': 'retour-klachten',
  'Retourneren De Raat Zoetermeer': 'retour-klachten',
  'Retourneren Breda Marzan Warehouse': 'retour-klachten',
  'Opvolging klacht / defect / waar blijft mijn bestelling / mijn kluis gaat niet open - klant, e.d.':
    'retour-klachten',

  // → Betalen & Administratie
  'BTW verlegd, intercommanautaire levering': 'betalen-administratie',
  'E-factureren overheid - Nederland': 'betalen-administratie',
  'Openstaande factuur, verzoek tot betaling': 'betalen-administratie',
  'Brandbeveiliging Pro jaarlijkse licentie factureren': 'betalen-administratie',
  'HS code Harmonized Statistical code': 'betalen-administratie',
  'HS codes, Harmonized Statistical code': 'betalen-administratie',
  'EORI Marzan Security BV: NL857696531': 'betalen-administratie',
  'Bedrijfsgegevens KluisShop.be': 'betalen-administratie',
  'Bedrijfsgegevens KluisStore.nl': 'betalen-administratie',
  'Bedrijfsgegevens LIPS Brandkasten': 'betalen-administratie',
  'Bedrijfsgegevens Marzan Security NL': 'betalen-administratie',
  'Bedrijfsgegevens Marzan Security Belgium BV': 'betalen-administratie',
  'Kredietcheck zakelijke orders — procedure op rekening betalen': 'betalen-administratie',

  // → Verkoop & Productadvies
  'Wat is de garantietermijn?': 'verkoop-productadvies',
  'Ik wil een kluis anoniem aankopen, kan dat?': 'verkoop-productadvies',
  'Kan ik korting krijgen?': 'verkoop-productadvies',
  'Certificaat van kluis voor o.a. verzekering, kopie certificaat': 'verkoop-productadvies',
  'Waardeberging op deze kluis? > Nee.': 'verkoop-productadvies',
  'De onderkant van mijn kluis is beschadigd, is dat normaal?': 'verkoop-productadvies',
  'Wit poeder, brandwerende box': 'verkoop-productadvies',
  'Smelt het elektronisch codeslot van een (brandwerende) kluis in een brand?':
    'verkoop-productadvies',

  // → B2B Accounts
  'City Clinnics Key Account': 'b2b-accounts',
  'Werkinstructie orderproces New York Pizza NIEUWE filialen': 'b2b-accounts',
  'Werkinstructie POD inboeken New York Pizza NIEUWE filialen': 'b2b-accounts',
  'Procedure koppelen Klant SafetyFirst Brandbeveiliging Pro': 'b2b-accounts',

  // → Toeleveranciers & Partners
  'Overzicht merken toeleveranciers': 'toeleveranciers-partners',
  'Kniggendorf API': 'toeleveranciers-partners',
  'Email account Kniggendorf Portal naar klant': 'toeleveranciers-partners',
  'Verkopen via Bol.com': 'toeleveranciers-partners',

  // → Start hier
  'Werkroutine Customer Service': 'start-hier',
  'Ticket onderwerpen': 'start-hier',
  'SPAM berichten sluiten / verwijderen': 'start-hier',
  'Emailen naar klant vanuit Freshdesk': 'start-hier',

  // → Orderverwerking (expliciet, vallen anders onder een andere standaard)
  'Orderstatussen & labels in Magento — overzicht voor nieuwe medewerkers': 'orderverwerking',
  'Orderbevestigingen leveranciers — handmatig verwerken': 'orderverwerking',
  'Zdialer, bellen vanaf je PC / Zoho': 'start-hier',
  'Factuur (opnieuw) doorsturen naar klant per email': 'betalen-administratie',
  'Factuurgegevens aanpassen': 'betalen-administratie',
  'Sleutels bijbestellen, bijmaken, dupliceren': 'kluisproblemen',
};

// Artikelen die óók in de leerlijn "Start hier" horen, maar inhoudelijk
// elders thuishoren. Krijgen de tag start-hier.
const LEERLIJN = [
  'Inwerkprogramma Nieuwe Medewerker',
  'Software en systemen',
  'Screencasts Magento',
  'Werkroutine Customer Service',
  'Zelf doen, zelf ervaren, test product bestellen',
  'Orderstatussen & labels in Magento — overzicht voor nieuwe medewerkers',
  'Orderbevestigingen leveranciers — handmatig verwerken',
  'Opvolging installatie-orders — stap voor stap',
  'Kredietcheck zakelijke orders — procedure op rekening betalen',
];

// Tags op basis van trefwoorden in titel of samenvatting.
const TAGREGELS = [
  ['magento', /magento/i],
  ['pon', /\bpon\b|e-?fulfil|e-?warehouse/i],
  ['dropshipment', /dropship/i],
  ['installatie', /installat|verankering|werkbon|work order|site survey|opname|trap /i],
  ['b2b', /fletcher|new york pizza|city clinnics|key account|zakelijke/i],
  ['kredietcheck', /kredietcheck|op rekening|creditcheck/i],
  ['sleutels', /sleutel/i],
  ['nederland', /kluisstore|marzan security nl|\bnederland\b|\bNL\b/],
  ['belgie', /kluisshop|belgi/i],
  ['uk', /simplysafes|\(uk\)/i],
  ['escalatie-verplicht', /escaleer|escalatie|martijn|eindbesluit/i],
];

// --- Inlezen ----------------------------------------------------------------

const artikelen = [
  ...JSON.parse(readFileSync('import/zoho-artikelen.json', 'utf8')),
  ...JSON.parse(readFileSync('import/zoho-artikelen-extra.json', 'utf8')),
];

const normaliseer = (t) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Mogelijke duplicaten: identieke of bijna identieke titel.
const perTitel = new Map();
for (const a of artikelen) {
  const sleutel = normaliseer(a.title);
  if (!perTitel.has(sleutel)) perTitel.set(sleutel, []);
  perTitel.get(sleutel).push(a);
}
const duplicaatIds = new Set();
for (const groep of perTitel.values()) {
  if (groep.length > 1) for (const a of groep) duplicaatIds.add(a.id);
}
// Bijna-duplicaten: de ene titel is een prefix van de andere.
const sleutels = [...perTitel.keys()];
for (const a of sleutels) {
  for (const b of sleutels) {
    if (a !== b && b.startsWith(a) && a.length > 12) {
      for (const x of [...perTitel.get(a), ...perTitel.get(b)]) duplicaatIds.add(x.id);
    }
  }
}

// --- Mapping ----------------------------------------------------------------

const rijen = artikelen.map((a) => {
  const titel = a.title.trim();
  const uitzondering = UITZONDERINGEN[titel];
  const doel = uitzondering ?? STANDAARD[a.zohoCategory] ?? 'orderverwerking';

  const tekst = `${titel} ${a.summary ?? ''}`;
  const tags = TAGREGELS.filter(([, re]) => re.test(tekst)).map(([t]) => t);
  if (LEERLIJN.includes(titel)) tags.push('start-hier');

  const signalen = [];
  if (/freshdesk/i.test(tekst)) signalen.push('noemt Freshdesk');
  if (/credit ?safe/i.test(tekst)) signalen.push('noemt Credit Safe');
  if (/drive\.google|docs\.google/i.test(tekst)) signalen.push('Google Drive-link');
  if (duplicaatIds.has(a.id)) signalen.push('mogelijk duplicaat');
  if (a.status === 'Draft') signalen.push('was draft in Zoho');
  if (a.status === 'Unpublished') signalen.push('was unpublished in Zoho');
  if (!a.summary || a.summary.trim().length < 40) signalen.push('nauwelijks inhoud');
  const jaar = new Date(a.modifiedTime).getFullYear();
  if (jaar < 2025) signalen.push(`niet gewijzigd sinds ${jaar}`);

  return {
    id: a.id,
    titel,
    zohoCategorie: a.zohoCategory,
    nieuweCategorie: doel,
    nieuweCategorieNaam: CATEGORIEEN[doel],
    viaUitzondering: Boolean(uitzondering),
    tags,
    signalen,
    zohoStatus: a.status,
  };
});

// --- Wegschrijven -----------------------------------------------------------

const csvVeld = (v) => `"${String(v).replace(/"/g, '""')}"`;
const csv = [
  ['id', 'titel', 'zoho_categorie', 'nieuwe_categorie', 'tags', 'signalen', 'zoho_status']
    .map(csvVeld)
    .join(';'),
  ...rijen.map((r) =>
    [
      r.id,
      r.titel,
      r.zohoCategorie,
      r.nieuweCategorieNaam,
      r.tags.join(', '),
      r.signalen.join(' · '),
      r.zohoStatus,
    ]
      .map(csvVeld)
      .join(';'),
  ),
].join('\r\n');

writeFileSync('import/categorie-mapping.csv', '﻿' + csv, 'utf8');
writeFileSync('import/categorie-mapping.json', JSON.stringify(rijen, null, 2), 'utf8');

// --- Samenvatting -----------------------------------------------------------

console.log(`\n${rijen.length} artikelen ingedeeld.\n`);

const perDoel = new Map();
for (const r of rijen) perDoel.set(r.nieuweCategorieNaam, (perDoel.get(r.nieuweCategorieNaam) ?? 0) + 1);
console.log('Verdeling over de nieuwe categorieën');
for (const [naam, n] of [...perDoel.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${naam}`);
}

const metSignaal = rijen.filter((r) => r.signalen.length > 0);
console.log(`\n${metSignaal.length} artikelen met een reviewsignaal:`);
const perSignaal = new Map();
for (const r of metSignaal) {
  for (const s of r.signalen) {
    const kern = s.startsWith('niet gewijzigd') ? 'niet gewijzigd sinds vóór 2025' : s;
    perSignaal.set(kern, (perSignaal.get(kern) ?? 0) + 1);
  }
}
for (const [s, n] of [...perSignaal.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${s}`);
}

console.log('\nGeschreven: import/categorie-mapping.csv en import/categorie-mapping.json\n');
