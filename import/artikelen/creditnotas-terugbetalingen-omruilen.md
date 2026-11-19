---
titel: Creditnota's, terugbetalingen en omruilen in Magento
categorie: betalen-administratie
tags: magento
samenvatting: Hoe je in Magento een creditnota maakt, geld terugbetaalt of een order omzet naar een ander product. Vier situaties met stappen, de vijf vaste regels waar de boekhoudkoppeling op leunt, en wat je nooit doet.
type: procedure
landen: alle
kanaal: backoffice
---

## In het kort

Een order in Magento kun je **niet wijzigen**. Wil een klant iets anders, of krijgt hij (een
deel van) zijn geld terug, dan werk je altijd met een **creditnota** en eventueel een
**nieuwe order**.

Onze koppeling met de boekhouding leest die creditnota's automatisch uit. Dat werkt alleen
als iedereen het op dezelfde manier doet. Wijk je af, dan klopt de boekhouding niet meer en
moet het later met de hand worden uitgezocht.

### De vijf vaste regels

1. **Het bedrag van de creditnota is altijd gelijk aan wat de klant terugkrijgt of wat je
   doorschuift naar een nieuwe order.** Niet meer, niet minder.
2. **Volledige terugbetaling van een Mollie-order doe je altijd via Magento** (knop
   *Refund*). Nooit in het Mollie-dashboard.
3. **Gedeeltelijke terugbetaling van een Mollie-order doe je altijd in het
   Mollie-dashboard**, en daarnaast maak je in Magento een offline creditnota voor precies
   hetzelfde bedrag.
4. **Bij een omruilorder zet je altijd het oude ordernummer in het veld Extra info
   leverancier** (`extra_info_supplier`) van de nieuwe order, in de vorm `ORD12345`.
5. **Betaal je terug per bank, zet dan altijd het creditnotanummer in de omschrijving van
   de overschrijving.**

---

## Wanneer heb je dit nodig?

- Een klant wil een **order annuleren** of krijgt **geld terug** (helemaal of gedeeltelijk).
- Een klant wil een **ander product** dan hij besteld heeft: groter, kleiner of een ander
  model.
- Een product is niet leverbaar en de klant kiest een alternatief.
- Je moet in Magento een **creditnota** maken, bijvoorbeeld na een retour.

> [!NOTE]
> **Orders van marktplaatsen** vallen buiten deze procedure. Orders die echt via een
> marktplaats binnenkomen, zoals bol.com, lopen voor retouren en terugbetalingen via het
> platform zelf.

---

## De stappen

### Stap 1 — Bepaal welke situatie het is

Kijk wat de klant wil en of de order al betaald is.

| Wat wil de klant? | Is de order betaald? | Ga naar |
|---|---|---|
| Alles terug | Ja | Situatie A |
| Een deel terug | Ja | Situatie B |
| Een ander product (groter, kleiner, ander model) | Ja | Situatie C |
| Annuleren of een deel minder | Nee (Pay by Invoice of banktransfer, nog niet betaald) | Situatie D |

*Waarom:* elke situatie heeft een eigen route. Kies je de verkeerde, dan klopt het bedrag op
de creditnota niet met wat er werkelijk gebeurt.

*Valkuil:* **controleer eerst of de klant al betaald heeft.** Bij Pay by Invoice en
banktransfer is de order vaak nog niet betaald. Betaal nooit iets terug wat nog niet binnen
is.

---

### Stap 2 — Voer de situatie uit

#### Situatie A — De klant krijgt alles terug

**Betaald via Mollie** (creditcard, Apple Pay, Google Pay, PayPal, Klarna, betaallink,
Trustly):

1. Open de order in Magento en ga naar het tabblad **Invoices**.
2. Open de factuur en klik op **Credit Memo**.
3. Controleer de aantallen en bedragen.
4. Klik onderaan op **Refund**. Het geld gaat dan via Mollie terug naar de klant.

*Waarom:* een volledige Mollie-terugbetaling loopt altijd via Magento (regel 2). Zo staat de
creditnota en de terugbetaling in één keer goed.

*Valkuil:* de knop **Refund** zie je alleen als je de creditnota **vanuit de factuur**
maakt. Maak je hem vanuit de order zelf, dan zie je alleen **Refund Offline**. Dat is in
dit geval fout.

**Betaald via banktransfer, Pay by Invoice of Online Partner:**

1. Maak in Magento een creditnota voor het volledige bedrag en klik op **Refund Offline**.
2. Noteer het creditnotanummer.
3. Betaal het bedrag terug per bank, **met het creditnotanummer in de omschrijving**.

*Valkuil:* een overschrijving zonder creditnotanummer. De boekhouding kan de betaling dan
niet aan de creditnota koppelen.

#### Situatie B — De klant krijgt een deel terug

**Betaald via Mollie:**

1. Ga naar het **Mollie-dashboard** en zoek de betaling op. Het betalingsnummer (begint met
   `tr_`) staat bij de order in Magento.
2. Betaal daar het afgesproken deel terug.
3. Maak in Magento een creditnota voor **precies hetzelfde bedrag** en klik op **Refund
   Offline**. Gebruik de aantallen, of het veld voor een aanvullende terugbetaling als het
   niet om een heel product gaat.

De volgorde van stap 2 en 3 mag je omdraaien, maar **doe altijd allebei**.

*Waarom:* een gedeeltelijke terugbetaling doe je in het Mollie-dashboard (regel 3), maar de
boekhouding leest alleen de creditnota in Magento. Dus er moet in beide systemen hetzelfde
bedrag staan.

*Valkuil:* alleen het Mollie-dashboard doen, of alleen de creditnota maken. Dan is de klant
terugbetaald zonder creditnota, of andersom.

**Betaald via banktransfer, Pay by Invoice of Online Partner:**

1. Maak in Magento een creditnota voor het deelbedrag en klik op **Refund Offline**.
2. Betaal het bedrag terug per bank, **met het creditnotanummer in de omschrijving**.

#### Situatie C — De klant wil een ander product (omruilen)

De klant heeft al betaald en wil iets anders. We willen hem niet eerst zijn geld teruggeven
en opnieuw laten betalen. De betaling **schuift daarom door naar een nieuwe order**.

> **Voorbeeld (geen regel):** de klant heeft een kluis van 100 besteld en betaald. Die is
> niet leverbaar, maar een model groter van 120 wel, en dat wil de klant. De bedragen 100,
> 120 en het ordernummer `ORD12345` hieronder zijn alleen ter illustratie.

1. **Crediteer de oude order volledig offline.** Maak een creditnota voor het volledige
   bedrag en klik op **Refund Offline**. Betaal niets terug.
2. **Maak een nieuwe order aan via de backend**, voor het nieuwe product en het
   **volledige** bedrag (in het voorbeeld 120, niet 20). Kies als betaalmethode **Online
   Partner** of **Pay by Invoice**. Kies nooit Mollie.
3. **Zet het oude ordernummer in het veld Extra info leverancier** van de nieuwe order,
   bijvoorbeeld `Vervangt ORD12345`.
4. **Regel het verschil:**
   - **De klant betaalt bij** (nieuw product is duurder): maak in het Mollie-dashboard een
     betaallink voor **precies het verschil**. Zet in de omschrijving het **nieuwe**
     ordernummer, bijvoorbeeld `Bijbetaling ORD12399`. Stuur de link naar de klant.
   - **De klant krijgt geld terug** (nieuw product is goedkoper): betaal het verschil
     terug op de betaling van de **oude** order. Was die via Mollie, doe het dan in het
     Mollie-dashboard. Was die per bank, dan per bank met het creditnotanummer in de
     omschrijving.
   - **Geen verschil:** je hoeft verder niets te doen.

*Waarom:* de oude order kun je niet aanpassen. Door hem volledig te crediteren en het
bedrag door te schuiven naar een nieuwe order houd je de boekhouding sluitend (regel 1),
zonder dat het geld heen en weer gaat.

*Valkuilen:*

- **Kies nooit een Mollie-betaalmethode** op de nieuwe order: dan vraag je de klant het
  volledige bedrag opnieuw te betalen.
- **Zet de nieuwe order op het volledige bedrag**, niet op het verschil.
- **Vergeet het oude ordernummer niet** in Extra info leverancier (regel 4). Zonder dat
  nummer is niet te zien welke order de nieuwe vervangt.
- **Betaallink voor een bijbetaling:** zet het **nieuwe** ordernummer in de omschrijving,
  niet het oude.

#### Situatie D — De order is nog niet betaald

Geldt voor Pay by Invoice en banktransfer als de klant nog niet heeft betaald.

1. Maak een creditnota voor het bedrag dat vervalt en klik op **Refund Offline**.
2. **Betaal niets terug.** De klant betaalt alleen wat er na de creditnota nog openstaat.
   Bij een volledige creditnota staat er niets meer open.

*Waarom:* er is niets binnengekomen, dus er valt niets terug te betalen. De creditnota
verlaagt alleen wat de klant nog moet betalen.

*Valkuil:* terugbetalen "voor de zekerheid" zonder te hebben gecontroleerd of er betaald is
(zie stap 1).

---

## Wanneer haal je Martijn erbij?

Past een situatie niet in dit artikel? Doe dan **niets** en vraag het eerst na bij Martijn.

---

## Veelgemaakte fouten

| Fout | Gevolg |
|---|---|
| Een volledige Mollie-terugbetaling in het Mollie-dashboard doen in plaats van via Magento | Afwijking van de vaste werkwijze; de boekhouding klopt niet en moet later met de hand worden uitgezocht |
| Geld terugbetalen zonder creditnota in Magento, of een creditnota maken voor een ander bedrag dan je terugbetaalt | De boekhoudkoppeling leest een bedrag dat niet overeenkomt met wat er werkelijk is terugbetaald |
| De creditnota vanuit de order maken in plaats van vanuit de factuur (bij een volledige Mollie-terugbetaling) | Je ziet alleen *Refund Offline*; de klant krijgt zijn geld niet terug via Mollie |
| Een omruilorder aanmaken zonder het oude ordernummer in Extra info leverancier | Niet te zien welke order de nieuwe vervangt |
| Een omruilorder aanmaken met een Mollie-betaalmethode | De klant wordt gevraagd het volledige bedrag opnieuw te betalen |
| De nieuwe omruilorder op het verschil zetten in plaats van het volledige bedrag | Bedragen van oude en nieuwe order kloppen niet meer met elkaar |
| Terugbetalen voordat je hebt gecontroleerd dat de klant betaald heeft | Je betaalt iets terug wat nooit is binnengekomen |
| Per bank terugbetalen zonder het creditnotanummer in de omschrijving | Betaling is niet aan de creditnota te koppelen |
| Een marktplaatsorder (bijvoorbeeld bol.com) hier afhandelen | Retouren en terugbetalingen lopen daar via het platform zelf |

---

## Nog te controleren door Martijn

1. **Ordernummerformaat.** In dit artikel staat `ORD12345` als voorbeeld. Is dat het echte
   formaat, of zijn het nummers zoals `NL10-xxxxx` en `BE10-xxxxx`? Welk formaat moet in
   *Extra info leverancier*?
2. **Inhoud van Extra info leverancier.** Regel 4 zegt "in de vorm `ORD12345`", Situatie C
   zegt `Vervangt ORD12345`. Moet er alleen het ordernummer staan, of mag "Vervangt" ervoor?
   De boekhoudkoppeling leest dit veld, dus dit moet exact kloppen.
3. **Waarom volledig via Magento, gedeeltelijk via het dashboard?** Wat is de reden dat
   Magento alleen bij een volledige terugbetaling de Mollie-refund doet? Als ik dat weet,
   kan ik het "waarom" in regel 2 en 3 preciezer maken.
4. **Betaalmethoden onder Mollie.** De lijst in Situatie A noemt creditcard, Apple Pay,
   Google Pay, PayPal, Klarna, betaallink en Trustly. iDEAL en Bancontact staan er niet bij.
   Is de lijst compleet, of ontbreken er methoden?
5. **Veld voor aanvullende terugbetaling.** Hoe heet het veld in Magento letterlijk waarmee
   je een bedrag crediteert dat niet om een heel product gaat (Situatie B)?
6. **Verschil terugbetalen bij omruilen.** In Situatie C stap 4 betaal je een verschil terug
   op de oude order, nadat die al volledig offline gecrediteerd is. Is daar geen extra
   creditnota voor nodig, en welk creditnotanummer zet je dan in de omschrijving: dat van de
   volledige creditnota van de oude order?
7. **Pay by Invoice of Online Partner bij een omruilorder.** Wanneer kies je welke? En hoe
   voorkom je bij Pay by Invoice dat de klant een betalingsherinnering krijgt voor een order
   die eigenlijk al betaald is?
8. **Kanaal.** Dit artikel staat nu op backoffice. Moet het ook zichtbaar zijn voor
   klantcontact, omdat klantenservice de klant vaak als eerste spreekt?

---

_Gerelateerde artikelen: Retour verwerken — van aanvraag tot creditering | Betaalmethodes: welke kies je wanneer? | Magento backend-velden voor orderopvolging | Bestelling retourneren — gespreksroute_
