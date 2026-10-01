---
titel: Magento backend-velden voor orderopvolging
categorie: systemen-applicaties
tags: magento, installatie
samenvatting: Wat elk custom veld in de Magento-order betekent en hoe je ze samen gebruikt: promised date, updated date, interne info, opvolging bestelling, informatie toeleverancier en de bevestigingsvelden.
type: naslag
landen: alle
kanaal: backoffice
---

## In het kort

In de Magento-backend staan een aantal **zelf toegevoegde velden** om een order te kunnen
opvolgen. Ze werken alleen als iedereen ze op dezelfde manier invult. Drie regels die je
altijd aanhoudt:

1. **De promised date pas je nooit aan.** Wat beloofd is, blijft staan. Een nieuwe datum
   gaat in *updated date*.
2. **Elke actie gaat in *opvolging bestelling***, met datum en initialen. Dat is het
   volledige logboek.
3. ***Interne info* bevat alleen de laatste stand van zaken** — die komt terug in het
   orderdashboard.

---

## Wanneer heb je dit nodig?

- Je legt vast wat je met een klant of leverancier hebt afgesproken.
- Een leverdatum wordt niet gehaald en je moet dat correct verwerken.
- Je bekijkt een order van een collega en wilt weten wat er al gebeurd is.
- Je plaatst zelf een order in de backend en moet iets meegeven aan de toeleverancier.

---

## De velden

De velden staan in de order zelf, op het tabblad **Informatie**, in twee blokken: rechts het
blok **Levertijd informatie**, links de tekstvelden onder de bestelgegevens, met de knop
**Opslaan** eronder.

![Orderpagina in Magento: links Opvolging bestelling, Aanvullende informatie leverancier, Aanvullende informatie installateur en Klant factuur referentie; rechts het blok Levertijd informatie](/api/afbeelding/c553696d-b3dc-481b-9f66-db68a64ae84c/ba92f175-7e07-4ed8-927a-b8a8494f1edf.png)

Hieronder staat per veld wat je erin zet. Eerst de velden in het blok **Levertijd informatie**:

![Het blok Levertijd informatie in een Magento-order](/api/afbeelding/c553696d-b3dc-481b-9f66-db68a64ae84c/ef487e17-858c-4b8f-a3d6-686d86ec1f3d.png)

### Afgegeven levertijd bij bestelling (promised date)

De berekende levertijd, zoals beschreven in *Voorraadsynchronisatie en levertijdlogica*.

**Let op: dit veld is ook zichtbaar voor de klant.** Zowel als hij inlogt met een account,
als wanneer hij zonder in te loggen via de voorkant zijn bestelstatus opvraagt met
ordernummer en e-mailadres (een standaardfunctie van Magento). Alles wat je hier neerzet,
kan de klant dus lezen.

> **Uitzondering — bij een installatieservice of andere serviceopdracht** (zoals het openen
> of verplaatsen van een kluis) staat hier **NTB** (nog te bepalen), en in de UK-webshop
> **TBD** (to be determined), in plaats van een leverweek. Waarom dat zo is, staat verderop
> bij *Installatieservice*.

### Geüpdatet levertijd (updated date) — de herziene levertijd

Voor wanneer de oorspronkelijk beloofde datum niet gehaald gaat worden. Voorbeeld: de
promised date staat op 23 september, maar de leverancier koppelt terug dat het artikel niet
op voorraad is en het week 41 wordt. Dan zet je week 41 in *updated date*.

> [!WARNING]
> **Overschrijf de promised date nooit.** Die blijft staan als historisch referentiepunt.
> Alleen zo is later terug te zien wát er beloofd was, wat het uiteindelijk is geworden, en
> waarom dat afweek. Pas je hem toch aan, dan is het bewijs weg en lijkt het alsof er nooit
> iets is misgegaan.

Wordt een beloofde levertijd niet gehaald, dan moet de klant daarover geïnformeerd worden —
**bij voorkeur per e-mail**, zodat het vastligt en er achteraf geen discussie over ontstaat.

### Interne info — de laatste stand van zaken

Bevat in één oogopslag waar de order nu staat. Dit veld komt terug in het
**orderdashboard**, zodat je niet elke order hoeft te openen om te zien wat er speelt.

Voorbeeld: bij een gemiste levertijd noteer je hier de datum van het klantcontact —
`22-9 klant geïnformeerd` — zodat iedereen direct ziet dat er al actie is ondernomen.

### Opvolging bestelling — het volledige logboek

Dit veld en de twee *aanvullende informatie*-velden hieronder staan links op de orderpagina.
Vergeet na het invullen niet op **Opslaan** te klikken.

![De velden Opvolging bestelling, Aanvullende informatie leverancier, Aanvullende informatie installateur en Klant factuur referentie in een Magento-order](/api/afbeelding/c553696d-b3dc-481b-9f66-db68a64ae84c/d41e5110-32e3-4d35-bf58-b5c5719e18f9.png)

Hierin houd je **alle** acties en updates rond een order chronologisch bij. Dit is de hele
geschiedenis, in tegenstelling tot *interne info*, dat alleen het laatste bericht toont.

**Houd de vaste notatie aan:** `datum` + spatie + `initialen`, dan de notitie.

```
22/9 MZ: klant gebeld, akkoord met nieuwe leverweek
```

Gebruikte initialen, ter illustratie: MZ (Martijn Zandvliet), CB (Cindy de Banen), RVG
(Rainer Gumpert), HVG (Harmen van Gool).

Het laatste logbericht spiegel je meestal naar *interne info*, zodat het orderdashboard de
actuele stand toont terwijl de volledige historie — bijvoorbeeld dat een order al twee keer
eerder vertraagd is, en waarom — in de order zelf terug te vinden blijft.

### Aanvullende informatie leverancier — meesturen met de inkooporder

Vrij tekstveld voor instructies of mededelingen die **met de inkooporder naar de
toeleverancier** gaan. Bijvoorbeeld:

- Een **verkooppartnummer**, bijvoorbeeld bij een offerte met een speciale prijsafspraak.
  Zonder dat nummer krijgen wij gewoon de standaardprijs in plaats van de afgesproken prijs.
- Een **specifieke leverwens** van de klant, bijvoorbeeld: pas volgende week woensdag
  leveren.

> [!WARNING]
> **Dit veld werkt alleen bij orders die wij zelf in de backend invoeren.** Plaatst een
> klant zelf een bestelling in de webshop, dan wordt die **binnen enkele minuten
> automatisch doorgezet** naar de volgende partij (bijvoorbeeld PON). Alles wat je daarna
> nog invult, heeft **geen effect meer**.
>
> Vul dit dus in **vóórdat** je een backend-order doorzet — niet erna. Vergeet je het bij
> een prijsafspraak, dan betalen wij de standaardprijs en is dat niet meer terug te draaien
> op die order.

### Aanvullende informatie installateur — verouderd, niet meer gebruiken

> [!WARNING]
> Dit veld is in onbruik geraakt en staat op de planning om verwijderd of uitgeschakeld te
> worden. **Vul het niet meer in.**

Het was oorspronkelijk bedoeld voor extra informatie richting de installatiepartner, met
dezelfde werkwijze en dezelfde beperking als *aanvullende informatie leverancier*. Die functie is
overgegaan naar de **werkbon-app**: vanuit die app wordt de inkoop van de installatieservice
aangestuurd.

### Order day confirmation supplier / Order week confirmation supplier

De meeste toeleveranciers bevestigen een order voor een bepaalde **leverweek** (*order week
confirmation supplier*). Een klein aantal doet dat per **dag** (*order day confirmation
supplier*).

> [!WARNING]
> **Een dagbevestiging is géén afleverdag bij de klant.** Geen enkele toeleverancier levert
> zelf op een specifieke dag bij de eindklant. Zo'n dag is meestal:
>
> - een verwachte dag op basis van een interne rekenregel van de leverancier, of
> - de dag waarop de leverancier zelf verzendt of laat ophalen.
>
> Neem die dag dus nooit één op één over naar de klant. Toeleveranciers zijn niet bezig met
> een afleverdag, en je belooft iets wat niemand heeft toegezegd.

### Installer appointment confirmation

De datum waarop de installateur een afspraak heeft ingepland met de eindklant.

---

## Installatieservice: waarom het proces daar afwijkt

Zit er een installatieservice bij de order, dan klopt de standaard rekenmodule voor de
beloofde levertijd niet meer. Die is namelijk gebaseerd op een gewoon dropshipment zónder
installatie.

**Waarom het langer duurt:** de kluis gaat niet rechtstreeks naar de eindklant maar naar de
installatiepartner, die het zelf ook nog moet inplannen. Reken structureel op:

| Land | Extra tijd |
|---|---|
| Nederland | circa **+1 tot 2 weken** |
| België | circa **+1 tot 3 weken** |

**Zo pak je het aan:**

1. De **promised date blijft op NTB / TBD** staan tot er contact is geweest met de klant.
2. Neem **actief contact op** met de klant: bedank voor de bestelling en vraag de situatie
   uit.
3. Schep op basis daarvan een **concrete verwachting** (een leverweek), inclusief de extra
   tijd die de installatiepartner nodig heeft.
4. **Pas dan** vul je een concrete leverweek in bij *promised date*.

Zo wordt de verwachting rechtstreeks met de klant gemanaged, in plaats van dat het systeem
een te optimistische datum berekent die je daarna niet waar kunt maken.

---

## Veelgemaakte fouten

| Fout | Gevolg |
|---|---|
| De promised date aanpassen als de datum niet gehaald wordt | De historie is weg; niet meer aantoonbaar wat er beloofd was |
| Iets vertrouwelijks of intern in de promised date zetten | De klant kan dat veld zelf inzien via de voorkant |
| Alleen *interne info* bijwerken en niet *opvolging bestelling* | De historie ontbreekt; een collega ziet niet dat het al eerder misging |
| De notatie `datum + initialen` overslaan | Onduidelijk wie wanneer wat heeft gedaan; het logboek wordt onbruikbaar |
| *Aanvullende informatie leverancier* invullen bij een webshoporder | De order is al doorgezet; de instructie komt nooit aan |
| Een verkooppartnummer vergeten bij een prijsafspraak | Wij betalen de standaardprijs in plaats van de afgesproken prijs |
| Een dagbevestiging als afleverdag doorgeven aan de klant | De klant wacht thuis op een dag die niemand heeft toegezegd |
| Bij een installatieorder zelf een leverweek invullen | Te optimistische belofte; de installatiepartner moet nog inplannen |
| *Aanvullende informatie installateur* nog gebruiken | Verouderd veld; niemand leest het, de werkbon-app stuurt de installatie aan |

---

## Nog te controleren door Martijn

1. **Extra tijd bij installatie.** Kloppen +1 tot 2 weken (NL) en +1 tot 3 weken (BE) nog?
2. **Initialen.** Is er een vaste lijst met initialen per medewerker, en waar staat die?
3. **Dagbevestiging.** Welke toeleveranciers bevestigen per dag in plaats van per week? Die
   opsomming ontbreekt nu.
4. **Verouderd veld.** Is *aanvullende informatie installateur* al bij de webbouwer aangemeld om
   uitgeschakeld te worden, of moet dat nog gebeuren?
5. **Klant informeren.** Is er een standaardtekst voor de e-mail bij een gemiste
   levertijd, of schrijft iedereen die zelf?
6. **NTB/TBD.** Is dat de exacte schrijfwijze in beide webshops, en zijn er nog andere
   servicetypes waarbij dit geldt naast installatie, openen en verplaatsen?
7. **Orderdashboard.** Verwerkt het dashboard *interne info* letterlijk, of moet dat veld
   een bepaald format hebben om goed te tonen?
8. **Velden zonder uitleg.** In Magento staan ook *Service partner*, *Installer check-in date*
   en *Klant factuur referentie*. Wat zet je daarin, en wanneer?

---

_Gerelateerde artikelen: Voorraadsynchronisatie en levertijdlogica | Toeleveranciers — wat
gaat automatisch en waar grijp je zelf in? | Status van bestelling — gespreksroute_
