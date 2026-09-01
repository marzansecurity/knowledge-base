# Briefing — Marzan Kennisbank

**Versie:** 0.2 (besluiten 1 t/m 4 bevestigd)
**Datum:** 1 september 2026
**Repo:** Next.js 16 kennisbank-app (Supabase, Anthropic SDK)

---

## 1. Waarom dit bestaat

Elke keer dat er een nieuwe medewerker start, legt Martijn persoonlijk uit hoe de
systemen, procedures en producten werken. Dat kost tijd en het is elke keer hetzelfde
verhaal. De kennisbank moet die uitleg overnemen — niet als archief, maar zoals Martijn
het zelf doet: iemand aan de hand nemen, stap voor stap, inclusief het "waarom" en de
valkuilen.

Twee eisen die daaruit volgen en die alles in dit document sturen:

1. **Geleid én doorzoekbaar.** Een nieuwe medewerker moet een route kunnen doorlopen.
   Een ervaren medewerker moet één ding kunnen opzoeken. Dat mogen niet twee verschillende
   teksten worden — dan lopen ze binnen een half jaar uit elkaar.
2. **De kennis zit in de uitzonderingen.** Dat Payment Link niet werkt bij een deelbetaling,
   dat je bij een leverancier om bevestiging van de annulering moet vragen — dat is wat een
   nieuwe medewerker niet zelf bedenkt. Elk artikel moet daar ruimte voor hebben.

---

## 2. Wat er al staat (niet opnieuw bouwen)

Om te voorkomen dat er dubbel werk gebeurt:

- **Content in Postgres.** `articles.content_markdown`, gerenderd met react-markdown,
  bewerkt met de eigen editor. Versiegeschiedenis in `article_revisions`.
- **Categorieboom:** 10 handmatig ontworpen categorieën, één laag diep, met 156
  geïmporteerde Zoho-artikelen erop afgebeeld.
- **Meertalig:** nl/en/fr, met per-taal zoekvectoren en een vertaal-editor. Vertalingen
  hebben al `review_state` en `stale`.
- **Toegang:** Supabase Auth met 2FA, rollen reader/redacteur/admin, RLS én per-gebruiker
  categorie-toegang.
- **Zoeken:** `zoek_artikelen()` met trigram-indexen.
- **AI-assistent:** krijgt de hele toegankelijke kennisbank als één gecachet systeemblok en
  escaleert hard — geen controleerbare bron-id, dan geen antwoord.
- **Escalatieketen:** escalatie → inbox → geclusterd voorstel → concept-artikel, met
  herkomst traceerbaar.
- **Leerpad-schil:** `/[taal]/onboarding` met afvinklijst en voortgangsbalk tegen
  `article_reads`.

**Conclusie: de machine staat. Wat ontbreekt is inhoud en een klein stukje structuur.**

---

# DEEL A — Contentlaag

## A1. Besluit: artikeltype wordt een veld

**Probleem:** `articles` is nu één plat ding. Een gespreksroute, een naslagartikel en een
onboardingstap zijn dezelfde rij met een andere tag. Tags zijn vrije tekst, dus er valt
niets af te dwingen en niets op te selecteren.

**Besluit:** voeg `articles.type` toe als enum met vier waarden:

| type | Wat het is | Voorbeeld |
|---|---|---|
| `gespreksroute` | Klant zegt X → welke vragen stel je, welke takken zijn er | "Kluis gaat niet open" |
| `procedure` | Hoe voer je iets uit in een systeem, stap voor stap | "Order wijzigen naar nieuwe order" |
| `naslag` | Wat betekent iets, en hoe kies je | "Betaalmethodes: welke kies je wanneer" |
| `producttraining` | Vakkennis om te kunnen adviseren | "Normen en brandklassen", "Sloten en sleutels" |

**Waarom dit de belangrijkste toevoeging is:** het type bepaalt het sjabloon. Zonder dit
veld weet niemand — ook de AI niet, ook de schrijf-skill niet — wát voor ding een artikel
moet worden. Met dit veld is "welk artikel spreek ik hierna in" een beantwoordbare vraag.

De bestaande tag `gespreksroute` vervalt zodra het veld er is.

## A2. De vier sjablonen

Elk type heeft een vaste kopstructuur. Afwijken mag, maar dan bewust.

### gespreksroute
Ongewijzigd — de 16 bestaande routes zijn de standaard:
Geldig voor · beslisboom met genummerde stappen en expliciete takken ·
`> [!WARNING]`-blokken voor harde grenzen · doorzetten naar een medewerker ·
wat leg je vast · gerelateerde artikelen.

### procedure
```
In het kort            — 2-3 zinnen: wat bereik je hiermee
Wanneer heb je dit nodig
De stappen             — genummerd, per stap: wat je doet + waarom + valkuil
Veelgemaakte fouten    — tabel: fout | gevolg
Gerelateerde artikelen
```

### naslag
```
In het kort
Wanneer heb je dit nodig
De opties              — per optie: wat het is | kies dit als | kies dit NIET als
Beslisboom
Veelgemaakte fouten
Gerelateerde artikelen
```
Het "kies dit niet als" is verplicht. Daar zit de kennis.

### producttraining
```
In het kort
Waarom dit uitmaakt voor de klant
De basis               — wat klantenservice moet weten om te kunnen helpen
Verdieping             — technische diepte voor monteurs en gevorderden
Hoe adviseer je        — beslisregels: "als de klant X zegt, dan meestal Y, tenzij Z"
Veelgemaakte fouten
Gerelateerde artikelen
```
Gelaagd binnen één artikel, niet gesplitst per doelgroep — anders krijg je twee versies
die elkaar tegenspreken.

## A3. Besluit: de categorieboom blijft functioneel

Er zijn drie soorten kennis die de kennisbank moet dekken: procedures en werkwijzes,
systemen en applicaties, en producttraining. De verleiding is om dat onderscheid als
tweede indeling in de app te bouwen. Dat doen we niet — een medewerker met een klant aan
de lijn zoekt op onderwerp, niet op soort kennis.

De bestaande functionele boom dekt het grotendeels al: producttraining landt in
*Verkoop & Productadvies* en *Kluisproblemen*, procedures in de procescategorieën. Het
onderscheid tussen soorten kennis wordt bovendien al gedragen door `type` uit A1.

**Wat wel ontbreekt:** systemen en applicaties hebben geen thuis.

**Besluit:** één categorie toevoegen — **Systemen & Applicaties** — voor Magento, Zoho Desk,
de werkbon-app, het revenue dashboard en de rest van de stack. Verder blijft de boom zoals
hij is: één laag diep, tien wordt elf.

## A4. Besluit: "Geldig voor" wordt data

Nu staat de scope als vetgedrukte prozaregel in de gespreksroutes
(`**Geldig voor: KluisStore.nl — klantcontact**`). Daar kan niet op gefilterd worden en de
AI kan er niet op selecteren. Gevolg: een medewerker die KluisShop.be doet, kan een
antwoord krijgen dat over KluisStore gaat.

**Besluit:** twee velden op `articles`:

- `landen` — array van `nl` / `be` / `uk`, leeg betekent: geldt overal
- `kanaal` — enum `klantcontact` / `backoffice` / `technisch` / `alle`

De prozaregel blijft staan voor de lezer, maar wordt gegenereerd uit de velden in plaats
van met de hand getypt. De assistent filtert hierop bij het opbouwen van zijn context.

## A5. Besluit: `review_due_at` activeren

Het veld bestaat en wordt nergens gebruikt. Kennis over leveranciers, betaaltermijnen en
normen veroudert. Neem het patroon over dat al voor vertalingen bestaat:

- Bij publicatie: `review_due_at` = publicatiedatum + 12 maanden (of 6 voor alles met de
  tag `magento`, omdat daar het meest verandert).
- Verstreken datum → status `outdated` op het beheer-dashboard, met de eigenaar
  (`owner_id`) erbij.

---

# DEEL B — Presentatielaag

## B1. Leerpaden

De a/b-nummering van de bestaande routes ís al een leerpad: de a-reeks is fundament
(verifiëren, ticketregels, doorzetten), de b-reeks zijn de concrete klantvragen. Wat
ontbreekt is volgorde en verplichting — `/onboarding` sorteert nu op categorie en daarbinnen
willekeurig.

**Besluit — minimale toevoeging, geen nieuw systeem:**

- `articles.pad_volgorde` (integer, nullable) — bepaalt de plek in het leerpad. Leeg =
  staat niet in een pad, alleen doorzoekbaar.
- `articles.verplicht` (boolean) — moet gelezen zijn voor de onboarding is afgerond.
- `/onboarding` sorteert op `pad_volgorde` en toont "eerst dit" in plaats van een losse lijst.

Geen aparte `learning_paths`-tabel. Eén pad per rol is genoeg tot het tegendeel blijkt;
de per-gebruiker categorie-toegang bepaalt al wie wat ziet.

## B2. De interactieve kaart — wat het wél is

De oorspronkelijke wens was "een visuele interactieve kaart". Bij nader inzien is die wens
grotendeels al vervuld door drie dingen die er staan: de categorieboom, de onboarding-
afvinklijst en de AI-assistent.

**Besluit:** geen aparte kaart-module bouwen. In plaats daarvan één route,
`/[taal]/overzicht`, die de bestaande data visueel maakt:

- De elf categorieën als klikbare kaart, met per categorie het aantal gepubliceerde artikelen
  en hoeveel jij er al van gelezen hebt.
- Het leerpad als zichtbare route in plaats van een lijst.
- Filters op `landen` en `kanaal` — mogelijk gemaakt door A4.

**Dit bouwen we als laatste.** Een kaart bovenop dunne content maakt de content niet beter.

## B3. De assistent blijft de primaire route

"In mijn hoofd kunnen kruipen" gebeurt niet via een kaart maar via de assistent: iemand
typt een vraag en krijgt antwoord uit gepubliceerde artikelen, of een eerlijke escalatie.
Die is al gebouwd en escaleert hard, wat precies goed is.

Zijn kwaliteit is volledig een functie van de hoeveelheid gepubliceerde inhoud.
**Alles in Deel C gaat daarover.**

---

# DEEL C — Productie

## C1. Direct doen: publiceer de 16 gespreksroutes

Ze staan op `draft`, en de assistent krijgt uitsluitend `published` artikelen in zijn
context. Er ligt dus 16 artikelen aan bruikbare, doordachte inhoud die op dit moment
niets doet.

Nalopen, publiceren, klaar. Dit is de grootste sprong in bruikbaarheid voor de minste moeite.

## C2. De schrijfroute: Martijn spreekt in, de skill schrijft uit

Martijn moet niet gaan schrijven. Dat is precies waarom de huidige kennisbank platte tekst
is geworden. Wat werkt:

1. Martijn spreekt een onderwerp in terwijl hij het doet, met het waarom en de valkuilen erbij.
2. Een skill zet het transcript om naar een artikel volgens het sjabloon van het juiste `type`.
3. Ontbrekende informatie komt als **genummerde open vragen onderaan het artikel** — niet in
   een aparte mail.
4. Martijn beantwoordt alleen die vragen. De skill werkt ze de tekst in en zet de status van
   `draft` naar `published`.

Twee dingen die de skill moet weten omdat ze bij het eerste artikel al misgingen:

- **Eén transcript kan meerdere artikelen bevatten.** De uitleg over het wijzigen van een
  order bevatte een compleet onderwerp over betaalmethodes. Splitsen, niet inbouwen.
- **Voorbeeld en regel lopen door elkaar.** Bedragen en namen uit een concreet geval moeten
  als voorbeeld gemarkeerd worden, niet als regel. Dicteren levert bovendien verhaspelde
  getallen op — die altijd expliciet terugvragen.

Dit is de bestaande skill, doorgebouwd.

## C3. De escalatie-inbox is de prioriteitenlijst

Wat er hierna ingesproken moet worden, hoeft niemand te bedenken: de escalaties zeggen het.
Wat ontbreekt is frequentie en ritme.

**Besluit:**
- Tel per escalatie hoe vaak een vergelijkbare vraag terugkomt, en sorteer de inbox op
  aantal in plaats van chronologisch.
- Filter "deze week nieuw".
- Wekelijkse routine: inbox openen, top drie bekijken, die drie inspreken.

Geen cron of notificaties nodig — een vast moment in de week volstaat.

## C4. Fasering

| Fase | Wat | Waarom in deze volgorde |
|---|---|---|
| 1 | Gespreksroutes nalopen en publiceren | Directe winst, geen code nodig |
| 2 | `type` + sjablonen; betaalmethodes-artikel als eerste `naslag` | Zonder dit weet de skill niet wat hij maakt |
| 3 | Schrijf-skill doorbouwen | Vanaf hier schaalt de productie |
| 4 | `landen` + `kanaal`; `Systemen & Applicaties` toevoegen | Nodig zodra er meer dan één land aan content is |
| 5 | Inhoud vullen via de wekelijkse routine | Het echte werk |
| 6 | `pad_volgorde` + `verplicht`; `/overzicht` | Pas zinvol met voldoende artikelen |
| 7 | `review_due_at` activeren | Pas relevant als er iets te verouderen valt |

---

## Samenvatting schemawijzigingen

| Tabel | Wijziging |
|---|---|
| `articles` | `type` enum: gespreksroute / procedure / naslag / producttraining |
| `articles` | `landen` array (nl/be/uk), leeg = overal |
| `articles` | `kanaal` enum: klantcontact / backoffice / technisch / alle |
| `articles` | `pad_volgorde` integer nullable |
| `articles` | `verplicht` boolean, default false |
| `categories` | rij toevoegen: Systemen & Applicaties |
| `messages` | frequentietelling op escalaties t.b.v. sortering |

`review_due_at` bestaat al en hoeft alleen gebruikt te worden.

---

## Werkafspraak voor de repo

De regels voor het bouwen horen in de bestaande **`AGENTS.md`**, niet in een tweede
instructiebestand ernaast. Toe te voegen sectie: de vier artikeltypen met hun sjabloon, en
de regel dat een nieuw artikel altijd een `type` en een `owner_id` krijgt.

De bestaande regel — eerst `node_modules/next/dist/docs/` lezen voordat er Next.js 16-code
geschreven wordt — blijft onverkort gelden. Middleware heet hier `proxy`.

---

## Besloten

1. De vier artikeltypen dekken de lading.
2. Geen tweede indeling naast de categorieboom; wel één nieuwe categorie
   *Systemen & Applicaties*.
3. Eén leerpad voor iedereen; per-gebruiker categorie-toegang bepaalt wie wat ziet.
4. Geen aparte kaart-module, maar `/overzicht` bovenop bestaande data.

## Nog open

5. **Reviewtermijn.** Voorstel: 12 maanden standaard, 6 maanden voor alles met de tag
   `magento`. Nog te bevestigen — dit bepaalt hoe vaak artikelen als `outdated` terugkomen
   op het beheer-dashboard.
