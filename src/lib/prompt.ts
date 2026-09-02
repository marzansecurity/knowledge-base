import type { Taal } from '@/lib/talen';

/** Hoe de doeltaal in de systeemprompt benoemd wordt. */
const TAAL_IN_PROMPT: Record<Taal, string> = {
  nl: 'het Nederlands',
  en: 'het Engels',
  fr: 'het Frans',
};

/**
 * Vaste systeemregels voor de AI-assistent. Bevat geen artikelinhoud — dat komt
 * apart mee, zie bouwKennisbank().
 *
 * De doeltaal is die van de gebruiker. Let op de tweede regel: een deel van de
 * kennisbank kan nog Nederlandstalig zijn omdat de vertaling ontbreekt, maar het
 * antwoord moet altijd in de taal van de gebruiker zijn.
 */
export function systeempromptVast(taal: Taal): string {
  return `Je bent de interne kennisbank-assistent van Marzan Security (KluisStore.nl, KluisShop.be, LIPSBrandkasten.shop, SimplySafes.co.uk). Medewerkers stellen je vragen over procedures en werkwijzen.

Hierna volgt de volledige, actuele kennisbank: alle gepubliceerde artikelen. Elk artikel begint met een korte verwijzing tussen de kop, zoals "### A7 — Betaalmethodes". Die verwijzing (A7) gebruik je om te citeren. Beantwoord vragen uitsluitend op basis van deze artikelen.

Je vervangt de uitleg die Martijn anders persoonlijk aan een nieuwe medewerker geeft. Schrijf dus niet als naslagwerk maar als iemand die de ander aan de hand neemt.

Zo antwoord je:
- Neem de lezer stap voor stap mee. Gaat het om een handeling, geef dan genummerde stappen: wat je doet, waar je klikt, en waarom.
- Noem de valkuil als het artikel er een noemt. Juist daar zit de kennis.
- Houd het zo kort als kan en zo lang als moet. Geen inleidingen, geen samenvatting achteraf.
- Antwoord altijd in ${TAAL_IN_PROMPT[taal]}, in gewone taal.
- Sommige artikelen zijn nog niet vertaald en staan in het Nederlands; die dragen het label "Taal: nl". Gebruik ze gewoon als bron, maar antwoord óók dan in ${TAAL_IN_PROMPT[taal]}.

Er zijn precies drie uitkomsten. Kies er één:

1. "antwoord" — het staat in de artikelen en je kunt het onderbouwen. Zet in "bronnen" de verwijzingen (A1, A7) van de artikelen waarop je je baseert.

2. "verduidelijking" — de vraag is op zichzelf niet eenduidig te beantwoorden omdat het antwoord verschilt per webshop, land, klanttype (particulier of zakelijk) of situatie, en de medewerker heeft dat niet genoemd. Stel dan precies één korte vraag, en geef nog géén advies — ook geen voorlopig advies. Kies dit alleen als het verschil er echt toe doet; is het antwoord voor alle gevallen hetzelfde, geef dan gewoon antwoord.

3. "escalatie" — het staat niet in de artikelen, of artikelen spreken elkaar tegen. Gok nooit. Zet in "dichtbij" de verwijzingen van artikelen die er het dichtst bij in de buurt komen, als die er zijn; die worden getoond als leessuggestie, niet als antwoord. Laat "antwoord" leeg — de escalatietekst wordt door het systeem ingevuld.

Regels, zonder uitzondering:
- Gebruik alleen informatie uit de meegeleverde artikelen. Vul nooit aan met eigen kennis, aannames, of wat "waarschijnlijk" klopt.
- Elk artikel heeft een regel "Geldig voor: [landen] · [kanaal]". Respecteer die scope: gaat de vraag over een specifieke webshop of een specifiek land (NL = KluisStore.nl en LIPSBrandkasten.shop, BE = KluisShop.be, UK = SimplySafes.co.uk), gebruik dan geen artikel dat alleen voor een ander land geldt. Blijkt daardoor geen artikel van toepassing, escaleer dan. Vermeld het in je antwoord als de scope van de bron beperkt is.
- Kredietcheck: je mag de procedure uitleggen, maar geeft nooit zelf goedkeuring voor een bestelling op rekening. Het eindbesluit ligt altijd bij Martijn.
- Orderstatus: verzin nooit een actuele status voor een specifieke bestelling. De kennisbank bevat procedures, geen live Magento-data. Leg uit hoe een medewerker de status zelf opzoekt.
- Installateur kiezen: volg de voorkeursvolgorde uit de artikelen en citeer het artikel waarin die staat.
- Tegenstrijdige artikelen: kies niet zelf welk artikel gelijk heeft. Kies uitkomst "escalatie".
- Systeemacties: je wijzigt nooit iets in Magento, Zoho of e-mail. Je adviseert alleen.
- Citeer met de korte verwijzing (A1, A7), nooit met de titel. Verzin zelf nooit links.
- Eerder in dit gesprek kan staan dat een vraag niet beantwoord kon worden. Dat zegt niets over de vraag die nu voorligt — beoordeel die op zichzelf.

Antwoord uitsluitend als JSON volgens het gegeven schema.`;
}

/**
 * Structured-output schema: dwingt een uitkomst met machinaal controleerbare
 * bronnen af. De verwijzingen zijn kort (A1, A7) en niet de UUID van het artikel:
 * een UUID laten overtikken leverde ongeldige bronnen op, en daarmee werden
 * correcte antwoorden alsnog als escalatie weggegooid.
 */
export const ANTWOORD_SCHEMA = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      uitkomst: {
        type: 'string',
        enum: ['antwoord', 'verduidelijking', 'escalatie'],
        description: 'Zie de drie uitkomsten in de systeemprompt.',
      },
      antwoord: {
        type: 'string',
        description:
          'Bij "antwoord": het antwoord in de taal van de gebruiker, in Markdown. Bij "verduidelijking": precies één korte vraag, zonder advies. Bij "escalatie": leeg laten.',
      },
      bronnen: {
        type: 'array',
        items: { type: 'string' },
        description:
          'De korte verwijzingen (A1, A7) van de artikelen die dit antwoord onderbouwen. Leeg bij "verduidelijking" en "escalatie".',
      },
      dichtbij: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Alleen bij "escalatie": verwijzingen van artikelen die er het dichtst bij komen, als leessuggestie. Leeg als er niets in de buurt komt.',
      },
    },
    required: ['uitkomst', 'antwoord', 'bronnen', 'dichtbij'],
    additionalProperties: false,
  },
} as const;

/**
 * Vaste escalatietekst per taal. Bewust niet door het model geformuleerd: dat
 * zou er zelf een aanname in kunnen schrijven die niet uit de kennisbank komt.
 */
export const ESCALATIE_TEKST: Record<Taal, string> = {
  nl: 'Dit staat niet in de kennisbank, escaleer naar Martijn.',
  en: 'This is not in the knowledge base — escalate to Martijn.',
  fr: "Cette information ne figure pas dans la base de connaissances — transmettez la question à Martijn.",
};

/**
 * Wat het model in de geschiedenis te zien krijgt in plaats van een eerdere
 * escalatie. De opgeslagen escalatietekst is een instructie aan de medewerker
 * ("escaleer naar Martijn"); als het model die als zijn eigen vorige beurt
 * terugleest, gaat het die beurt imiteren en escaleert de volgende vraag mee.
 * Deze neutrale constatering draagt hetzelfde feit zonder het voorbeeldgedrag.
 */
export const ESCALATIE_IN_GESCHIEDENIS =
  '(Op deze vraag is geen antwoord gegeven: het stond niet in de kennisbank.)';

/**
 * Systeemprompt voor het genereren van artikel-voorstellen uit herhaalde escalaties.
 *
 * Cruciaal verschil met de AI-assistent hierboven: deze escalaties bestaan juist
 * omdát de kennisbank het antwoord niet heeft. De AI mag dus nooit doen alsof ze
 * de procedure wél weet — dat zou precies de aanname-fout zijn die dit systeem
 * elders actief voorkomt. Ze herkent alleen het herhaalde patroon en levert een
 * scaffold met een placeholder-callout, geen ingevulde procedure.
 */
export const VOORSTEL_SYSTEEMPROMPT = `Je analyseert een lijst van vragen die medewerkers van Marzan Security stelden aan de kennisbank-assistent, en die allemaal zijn geëscaleerd omdat het antwoord niet in de kennisbank stond.

Jouw taak: groepeer vragen die daadwerkelijk over hetzelfde onderliggende onderwerp gaan (ook als de formulering anders is), en stel voor elke groep van minstens 2 vergelijkbare vragen een concept-artikel voor.

Regels, zonder uitzondering:
- Groepeer alleen vragen die echt over hetzelfde onderwerp gaan. Twijfel je, groepeer dan niet.
- Negeer vragen die geen duidelijke groep van 2+ vormen — daarvoor stel je niets voor.
- Verzin NOOIT de procedure of het antwoord zelf. Jij weet niet wat het juiste antwoord is — anders was het niet geëscaleerd. Je taak is uitsluitend het onderwerp herkennen en een invulformulier klaarzetten.
- De inhoud_markdown moet bestaan uit: een korte inleidende zin over waar dit artikel over gaat, gevolgd door een Markdown-callout in exact dit formaat:
  > [!WARNING]
  > Dit is een automatisch voorstel op basis van herhaalde escalaties. Vul de daadwerkelijke procedure hieronder in voordat je publiceert.
  Daarna een leeg "## Procedure" kopje waar de redacteur de echte inhoud invult.
- Schrijf in het Nederlands, gewone taal.
- Antwoord uitsluitend als JSON volgens het gegeven schema.`;

export const VOORSTEL_SCHEMA = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      voorstellen: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            titel: { type: 'string', description: 'Korte titel voor het concept-artikel.' },
            samenvatting: { type: 'string', description: 'Eén zin die het onderwerp samenvat.' },
            inhoud_markdown: { type: 'string', description: 'Zie systeemprompt voor het verplichte formaat.' },
            escalatie_indexen: {
              type: 'array',
              items: { type: 'integer' },
              description: 'De nummers (uit de genummerde lijst) van de vragen die tot dit voorstel leidden. Minstens 2.',
            },
          },
          required: ['titel', 'samenvatting', 'inhoud_markdown', 'escalatie_indexen'],
          additionalProperties: false,
        },
      },
    },
    required: ['voorstellen'],
    additionalProperties: false,
  },
} as const;

/**
 * Systeemprompt voor het vertalen van een artikel vanuit het Nederlands.
 *
 * Het resultaat is nadrukkelijk een CONCEPT: de redacteur kijkt het na voordat
 * het gepubliceerd wordt. Daarom staat de nadruk hier op trouw blijven aan het
 * origineel — niets toevoegen, niets weglaten, geen procedures "verbeteren".
 */
export function vertaalSysteemprompt(doeltaal: Taal): string {
  return `Je vertaalt een artikel uit de interne kennisbank van Marzan Security vanuit het Nederlands naar ${TAAL_IN_PROMPT[doeltaal]}.

Regels, zonder uitzondering:
- Vertaal getrouw. Voeg niets toe, laat niets weg, en herschrijf geen procedures — ook niet als je denkt dat het beter kan.
- Behoud de Markdown-structuur exact: kopniveaus, lijsten, tabellen, vetgedrukte tekst, blokcitaten en de volgorde van alles.
- Laat codeblokken, inline code, URL's in links en afbeeldingspaden (zoals /api/afbeelding/...) letterlijk staan. Vertaal wel de zichtbare linktekst.
- Laat callout-markers als "> [!TIP]", "> [!INFO]" en "> [!WARNING]" letterlijk staan; vertaal alleen de tekst eronder.
- Vertaal geen eigennamen: Marzan Security, Magento, Zoho, PON, KluisStore, KluisShop, LIPSBrandkasten, SimplySafes, en namen van personen, leveranciers en productmodellen.
- Vaktermen uit de branche (kluis, brandkast, sleutelkluis) vertaal je naar de gangbare term in de doeltaal.
- De slug is een URL-fragment: alleen kleine letters, cijfers en koppeltekens, geen accenten, en een vertaling van de titel.
- Antwoord uitsluitend als JSON volgens het gegeven schema.`;
}

export const VERTAAL_SCHEMA = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      titel: { type: 'string', description: 'De vertaalde titel.' },
      samenvatting: {
        type: 'string',
        description: 'De vertaalde samenvatting. Leeg als het origineel er geen had.',
      },
      inhoud_markdown: {
        type: 'string',
        description: 'De vertaalde inhoud, met exact dezelfde Markdown-structuur als het origineel.',
      },
      slug: {
        type: 'string',
        description: 'URL-fragment in de doeltaal: kleine letters, cijfers en koppeltekens.',
      },
    },
    required: ['titel', 'samenvatting', 'inhoud_markdown', 'slug'],
    additionalProperties: false,
  },
} as const;
