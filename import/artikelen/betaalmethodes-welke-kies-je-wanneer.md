---
titel: Betaalmethodes: welke kies je wanneer?
categorie: betalen-administratie
tags: magento
samenvatting: De vier betaalmethodes die je in de backend kunt kiezen, wat er wel en niet achter zit (herinneringen, facturen), en welke je kiest bij een deelbetaling of een zakelijke klant.
type: naslag
landen: alle
kanaal: backoffice
---
## In het kort

Zodra jij een order in de backend aanmaakt of wijzigt, kies jíj de betaalmethode.
Die keuze bepaalt drie dingen: wat de klant krijgt (een betaallink, bankgegevens of een
factuur), of er automatisch een herinnering gaat lopen als hij niet betaalt, en of de
order kan worden vrijgegeven voordat het geld binnen is.

De vier methodes zijn **niet uitwisselbaar**. De verkeerde keuze levert bijna nooit een
foutmelding op — het gevolg is dat de klant niet betaalt en niemand het merkt.

## Wanneer heb je dit nodig?

- Je maakt een bestelling handmatig aan vanuit de backend (telefonisch, per mail, uit een offerte).
- Je vervangt een bestaande order door een nieuwe (bijvoorbeeld bij niet-leverbaarheid).
- De klant heeft al een deel betaald en er staat nog een restbedrag open.
- Een zakelijke klant wil op rekening kopen.

---

## Eerst dit: voorkant en achterkant zijn niet hetzelfde

Aan de **voorkant** krijgt de klant tijdens het afrekenen automatisch alle betaalmethodes
gepresenteerd die voor die webshop zijn ingeregeld. Dat is een langere lijst dan wat jij
in de backend kunt kiezen — en logisch: Apple Pay kunnen wij niet selecteren, want wij
hebben de telefoon van de klant niet in onze hand.

De methodes verschillen ook per land, omdat betaalgedrag per land verschilt: iDEAL in
Nederland, Bancontact in België, in het Verenigd Koninkrijk vooral creditcard, PayPal en
Klarna. Wero wordt Europees breed uitgerold, maar is in het VK onbekend. **De principes
zijn overal identiek**, alleen het aanbod wijkt af.

Wat de klant aan de voorkant ziet, staat per webshop op de klantenservicepagina:

- KluisStore.nl: <https://www.kluisstore.nl/klantenservice/betaalmogelijkheden>
- KluisShop.be: <https://www.kluisshop.be/klantenservice/betaalmogelijkheden>
- LIPS Brandkasten: <https://lipsbrandkasten.shop/klantenservice/betaalmethodes>
- SimplySafes.co.uk: <https://www.simplysafes.co.uk/customer-service/how-to-pay>

Dit artikel gaat over de vier methodes die **jij** in de backend kunt kiezen.

---

## De vier methodes in de backend

### 1. Online partner

**Wat het is:** de restcategorie. "One size fits all" — als geen van de andere drie past,
kun je hier altijd naar uitwijken.

**Wat er achter zit:** niets. Geen betaalprovider, geen herinneringssysteem.

**Kies dit als:** de andere drie methodes de situatie niet dekken.

**Kies dit niet als:** er nog geld moet binnenkomen dat bewaakt moet worden. Er gaat
niemand achteraan.

---

### 2. Payment Link

**Wat het is:** de klant krijgt een bestelbevestiging met daarin een link waarmee hij de
betaling zelf start.

**Wat de klant merkt:** in de bevestigingsmail staat een "klik hier"-tekst. Daarachter
verschijnen de betaalmethodes die voor die webshop zijn ingeregeld.

**Let op:** als je Payment Link aanvinkt, verschijnt er in de backend een lijst met
betaalmethodes. Die hoef je **niet** te selecteren — dat is aan de voorkant per webshop
al geregeld.

**Kies dit als:** het **volledige** orderbedrag nog betaald moet worden.

**Kies dit niet als:**
- de klant al (een deel) betaald heeft. De link vraagt om het hele bedrag. De klant ziet
  dat, herkent zijn eerdere betaling niet terug en betaalt niet — terecht.
- je zeker wilt weten dat een openstaand bedrag bewaakt wordt. Maakt de klant de betaling
  niet af, dan is er simpelweg niet betaald: de order wordt afgevoerd en er blijft niets
  openstaan. Precies zoals bij een klant die aan de voorkant afrekent, zijn code vergeet
  of zich bedenkt. Wij gaan niet achter mislukte online betalingen aan.

---

### 3. Bank Transfer

**Wat het is:** een gewone handmatige overschrijving van de rekening van de klant naar de onze.

**Wat de klant krijgt:** een **bestelbevestiging** — géén factuur. Daarop staan onze
bankgegevens en het kenmerk waaronder hij moet overmaken.

**Wanneer komt de factuur?** Pas nadat er betaald is. Zolang er niet betaald is, blijft
de order in afwachting van betaling staan en gaat er niets de deur uit.

**Herinneringen:** geen. Betaalt de klant niet, dan blijft de order eindeloos wachten tot
iemand er toevallig overheen struikelt.

**Kies dit als:** een overschrijving echt de afspraak is én jij de order zelf blijft volgen.

**Veelvoorkomend misverstand:** zakelijke klanten kiezen vaak Bank Transfer terwijl ze
eigenlijk een **factuur** willen. Bedrijven betalen namelijk niet op basis van een
instructie in een bestelbevestiging, maar op basis van een factuur. Zie je dat gebeuren,
dan is Pay by Invoice de juiste route — daar krijgen ze een echte factuur. Wel goed om te
weten: die factuur komt pas ná verzending of levering.

---

### 4. Pay by Invoice (op rekening)

**Wat het is:** de klant krijgt een factuur die hij achteraf betaalt. Hierachter zit wél
een automatisch herinneringssysteem.

**Wanneer gaat de factuur eruit?** Op het moment dat de **verzending wordt ingeboekt** —
dus wanneer de dropshipment verstuurd wordt, of wanneer er bij een installatie geleverd is.

**Het herinneringssysteem** (drie stappen, geldt voor alle webshops):

| Moment na factuurdatum | Wat er gebeurt |
|---|---|
| 18 dagen | 1e herinnering |
| 32 dagen | 2e herinnering |
| 38 dagen | Aanmaning |

De standaard betaaltermijn is 14 dagen. Een langere betaaltermijn kan, maar alleen voor
bedrijven, alleen als dat **vooraf** is overeengekomen (bijvoorbeeld als onderdeel van een
onderhandeling of offerte), en het moet **apart worden ingesteld voordat de order wordt
ingevoerd**. Kom je zoiets tegen: eerst bij Martijn checken.

**Kies dit als:**
- het een **zakelijke** klant is die op rekening mag kopen (zie: op-rekening-check), of
- er al een deel betaald is en er een restbedrag openstaat dat bewaakt moet worden.

**Particulieren:** doen we in principe niet, maar het komt voor. Bijvoorbeeld als een
klant zijn kluis al besteld heeft en er alsnog een installatie bij wil. Dat kun je dan
niet goed via een betaallink oplossen (zie punt 2: mislukte betalingen verdwijnen gewoon),
terwijl Pay by Invoice het bedrag wél bewaakt. Er zit risico aan, dus ook hier: **check
bij Martijn hoe en wat.**

**De belangrijkste valkuil:** bij het aanmaken van de factuur moet je kiezen voor
**"Geen betaling verwerken" / onbetaald**. Zet je hem op betaald, dan start het
herinneringssysteem niet en bewaakt niemand het openstaande bedrag meer. Dit is de fout
die je pas maanden later ontdekt.

---

## Beslisboom

```
Moet er nog geld binnenkomen op deze order?
│
├─ Nee, alles is al betaald
│   └─ Online partner
│
└─ Ja
    │
    ├─ Het VOLLEDIGE bedrag moet nog betaald worden
    │   ├─ Zakelijke klant die op rekening mag kopen?
    │   │   └─ Pay by Invoice
    │   ├─ Klant wil/moet overmaken en jij volgt het zelf?
    │   │   └─ Bank Transfer
    │   └─ Verder iedereen
    │       └─ Payment Link
    │
    └─ Er is al een DEEL betaald, er staat een restbedrag open
        └─ Pay by Invoice + factuur op ONBETAALD
           + meld in de opmerkingenbox wat er nog openstaat
```

Past niets? Dan Online partner — maar besef dat er dan niemand achter het geld aan gaat.

---

## Vergeet de opmerkingenbox niet

Wat je in de opmerkingenbox (comment box) typt, komt **in de transactionele e-mail** die
de klant krijgt. Dat is je enige kans om uit te leggen waarom het bedrag afwijkt van wat
hij verwacht.

Bij een restbedrag zet je er minimaal in: van welke order de eerdere betaling komt, wat er
nu nog openstaat, en hoe hij dat moet betalen.

**Voorbeeld** (UK-order, oorspronkelijk £649, waarvan £559 al betaald):

> Payment of £559.00 received from order ORD-87654. Payment due: £90.00.
> Please transfer to our bank account — see PDF invoice.

Vink daarbij ook aan dat de klant een **kopie van de factuur** krijgt. Komt er over een
jaar een garantieclaim, dan moet hij kunnen aantonen wat er geleverd en betaald is.

---

## En de boekhouding?

Zodra er een factuur wordt aangemaakt, gaat die automatisch door naar de boekhouding:
**Exact** voor NL/BE en **Xero** voor het VK. Dat is een koppeling vanuit Magento en een
eindstation voor de financiële administratie. Als klantenservice hoef je daar niets mee te doen.

---

## Veelgemaakte fouten

| Fout | Gevolg |
|---|---|
| Payment Link bij een gedeeltelijk betaalde order | Klant ziet het volle bedrag en betaalt niet |
| Factuur op "betaald" zetten bij Pay by Invoice | Geen herinneringen; restbedrag verdwijnt uit beeld |
| Bank Transfer kiezen en er verder niets mee doen | Order blijft eindeloos in afwachting van betaling staan |
| Zakelijke klant op Bank Transfer laten staan terwijl hij een factuur wil | Klant betaalt niet, want bedrijven betalen op factuur |
| Niets in de opmerkingenbox zetten | Klant snapt het bedrag niet en betaalt niet |

---

## Nog te controleren door Martijn

1. **Betaaltermijn UK:** de SimplySafes-pagina vermeldt 30 dagen ("strictly 30 days") en
   voor overheidsorganisaties een 30-dagen-account op basis van een ondertekende purchase
   order. Hierboven staat 14 dagen als standaard. Welke geldt waar?
2. **Particulieren UK:** de SimplySafes-pagina zegt expliciet dat er géén accounts voor
   particulieren zijn. Geldt de NL-uitzondering (installatie achteraf op rekening) dan niet
   voor het VK?
3. **Exacte labels:** kloppen de vier benamingen letterlijk met wat er in de backend staat?
4. **Voorkant NL/BE:** de klantenservicepagina's van KluisStore, KluisShop en LIPS zijn niet
   automatisch uitleesbaar. Wil je dat de lijst per shop in dit artikel komt, dan moet je die
   tekst aanleveren.


---

_Gerelateerde artikelen: Order wijzigen naar nieuwe order | Op rekening check_
