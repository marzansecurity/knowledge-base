---
titel: Toeleveranciers — wat gaat automatisch en waar grijp je zelf in?
categorie: toeleveranciers-partners
tags: dropshipment, pon, magento
samenvatting: Hoe een order via de toeleverancier loopt en wat de kolommen in het leveranciersoverzicht betekenen — voorraad-sync, inkooporder, orderbevestiging, vervoerder en tracking — en wat jij doet als er "manual" staat.
type: naslag
landen: alle
kanaal: backoffice
---

## In het kort

Per leverancier staat in het **[leveranciersoverzicht](/nl/leveranciers)** wat er automatisch
gaat en waar jij zelf iets moet doen. Dit artikel legt uit wat de kolommen in dat overzicht
betekenen en wat je doet bij elke status. In het overzicht open je dezelfde uitleg met de
ⓘ-knop naast elke kolomnaam.

- Het **plaatsen van de inkooporder** gaat vrijwel altijd vanzelf.
- Het verschil tussen leveranciers zit in wat er daarna gebeurt: komt de **orderbevestiging**
  (leverweek) vanzelf in Magento, en komt de **tracking** vanzelf binnen?
- Staat er **Manual**, dan gebeurt het niet als jij het niet doet. Daar zit het werk.
- **Nederland & België** en het **Verenigd Koninkrijk** hebben elk een eigen tabblad. Dezelfde
  leverancier kan in de UK anders werken dan in NL/BE — kijk dus altijd in het tabblad van de
  webshop waar de order vandaan komt.
- Helemaal onderaan staat een apart blok **Containerinkoop**: leveranciers waar we containers
  bestellen (bulk, via Phoenix: Diplomat en Safewell). Daar is geen tracking en dat regelt
  Martijn zelf. Als backoffice hoef je daar niets mee.

---

## Wanneer heb je dit nodig?

- Je ziet een order zonder leverweek of zonder track & trace staan en vraagt je af of dat
  fout gaat of dat het systeem het nog oppakt.
- Een klant vraagt naar zijn track & trace en je moet weten of die er automatisch aan komt.
- Je werkt de dagelijkse orderopvolging bij en wilt weten welke leveranciers je
  handmatig moet nalopen.
- Er wordt een nieuwe leverancier aangesloten en je moet hem in het overzicht zetten.

---

## Hoe een order loopt

1. **De order komt binnen** — de klant plaatst hem in de webshop, of wij plaatsen hem zelf
   via de backend.
2. **De order krijgt een statuslabel** dat bepaalt hoe hij verder loopt:
   - **E-fulfilment** → het artikel komt uit onze eigen voorraad bij **PON** (onze
     3PL-partner). Via een API-koppeling gaat de order automatisch naar PON, die pickt,
     verstuurt én de track & trace automatisch terugkoppelt. Voor NL/BE kopen wij een deel
     van de producten van De Raat, Kruse en Phoenix in grotere aantallen in; die liggen bij
     PON en lopen dus als E-fulfilment.
   - **Dropshipment** → de inkooporder gaat automatisch naar de juiste toeleverancier, die
     rechtstreeks aan de klant levert.
3. **Van elke geplaatste dropshipment-inkooporder wordt automatisch een kopie bewaard** in
   de gedeelde mailbox **orders@marzansecurity.com**, in de submap **Inkooporders** onder
   Postvak IN.

> Moet je terugzoeken of een inkooporder daadwerkelijk de deur uit is gegaan? Kijk dan
> altijd eerst in die submap. Daar staan ze allemaal.

---

## De onderdelen in het overzicht

### Voorraad-sync

**Wat het is:** de koppeling waarmee de leverancier zijn voorraad met ons deelt. Die voedt
rechtstreeks de levertijd die Magento aan de klant belooft. Hoe dat precies werkt staat in
*Voorraadsynchronisatie en levertijdlogica*.

- **Auto** — de voorraad wordt automatisch bijgewerkt. In het overzicht staat erbij hoe vaak.
- **n.v.t.** — er is geen koppeling nodig, bijvoorbeeld omdat de producten vrijwel altijd op
  voorraad zijn.
- **Manual** — de voorraad wordt met de hand bijgewerkt. Reken er dan niet op dat de getoonde
  levertijd actueel is.

**Dropshipment én E-fulfilment?** Dan loopt de voorraad langs twee wegen. Het deel dat bij PON
op voorraad ligt (E-fulfilment) wordt automatisch bijgewerkt via PON; de status in het
overzicht gaat over het dropshipment-deel. Daarom staat er bij zo'n leverancier onder de
voorraad-sync *E-fulfilment: auto via PON*.

### Inkooporder

**Wat het is:** het doorzetten van de bestelling naar de toeleverancier.

- **Auto** — de inkooporder gaat vanzelf de deur uit zodra de order binnenkomt. Je hoeft
  niets te doen; een kopie staat in de mailbox (zie hierboven).
- **Manual** — jij plaatst de inkooporder zelf. Bij Gunnebo gaat dat via een eigen
  inkoopformulier; dat staat in *Inkooporder plaatsen bij Gunnebo* (gekoppeld op de pagina van
  Gunnebo).

**Valkuil:** bij een order die wij zelf in de backend invoeren, moet je informatie voor de
toeleverancier invullen **vóórdat** je hem doorzet. Daarna gaat de inkooporder al weg en
heeft het geen effect meer — zie *Magento backend-velden voor orderopvolging*.

### Orderbevestiging

**Wat het is:** de bevestiging van de toeleverancier met de leverweek (of leverdag). Die
leverweek hoort in Magento te staan, zodat iedereen ziet wanneer er geleverd wordt.

- **Auto** — de bevestiging wordt automatisch uitgelezen en de leverweek komt vanzelf in
  Magento.
- **Manual** — jij opent de orderbevestiging (in de mailbox) en neemt de leverweek zelf over
  in Magento, in *week confirmation supplier* of *day confirmation supplier*.

**Valkuil:** een dagbevestiging van de leverancier is géén afleverdag bij de klant. Neem die
nooit één op één over naar de klant.

### Tracking

**Wat het is:** de track & trace van de zending. Komt die in Magento, dan krijgt de klant
hem, en wordt de order afgesloten. Welke vervoerder de zending brengt, staat in de kolom
ervoor.

- **Auto** — de leverancier levert de tracking aan (bij Nauta en De Raat aan het einde van
  de dag als databestand op een eigen serverlocatie), die wordt automatisch verwerkt en
  **de order wordt daarmee in Magento afgesloten**. Zie je 's ochtends bij zo'n leverancier
  geen tracking, dan is er iets mis — die hoort er dan te staan.
- **Half** — de tracking komt automatisch binnen, maar het proces is nog niet bewezen
  betrouwbaar of loopt aan de kant van de leverancier nog met de hand. Controleer bij zo'n
  order dus wel of er echt een track & trace is binnengekomen.
- **Manual** — jij voert de track & trace zelf in. Doe je dat niet, dan blijft de order
  openstaan en hoort de klant niets.
- **n.v.t.** — er is geen track & trace, bijvoorbeeld bij Gunnebo of Kniggendorf, of de order
  loopt via PON (E-fulfilment). Beloof de klant dan ook geen track & trace.

---

## Wat de statussen betekenen

| Status | Betekenis | Wat jij doet |
|---|---|---|
| **Auto** | Loopt vanzelf | Niets — alleen ingrijpen als het er niet staat terwijl het er wel hoort te staan |
| **Half** | Loopt deels vanzelf, of nog niet bewezen betrouwbaar | Controleren of het echt gebeurd is |
| **Manual** | Gebeurt niet vanzelf | Zelf doen |
| **n.v.t.** | Niet van toepassing of niet nodig | Niets |
| **?** | Nog niet ingevuld | Navragen voordat je ervan uitgaat dat het vanzelf gaat |

---

## Leverancier of vervoerder? Haal dat niet door elkaar

> [!WARNING]
> **Bpost, GLS, DPD, Schenker, Transmission en Schmidt & Gevelberg zijn vervoerders, geen
> toeleveranciers.**

Wij hebben **zelf geen contract** met deze vervoerders. De toeleverancier heeft zijn eigen
vervoerdercontracten en bepaalt zelf welke vervoerder hij voor welk type zending inzet. In
het overzicht staat per leverancier welke vervoerder(s) hij gebruikt — dat is informatie, geen
contactpersoon. In de UK kan dat een andere vervoerder zijn dan in NL/BE.

Dat is niet alleen een woordenkwestie: het bepaalt **bij wie je moet zijn**. Loopt een
zending mis, dan bel je niet de vervoerder maar de toeleverancier — die is onze
contractpartij en heeft als enige grip op de vervoerder.

---

## Een nieuwe leverancier toevoegen

Dit kan alleen een redacteur of beheerder.

1. Ga naar **Leveranciers** in het menu en scrol naar **Nieuwe leverancier toevoegen**.
2. Vul de **naam** in, kies vanuit welk land hij **opereert**, en vink aan in welke regio's hij
   actief is: **Nederland & België**, het **Verenigd Koninkrijk**, of allebei. Klik op
   **+ Toevoegen**.
3. Je komt op de pagina van de nieuwe leverancier. Vul **per regio** de statussen in — werkt de
   leverancier in de UK anders, dan vul je dat daar apart in. **Weet je iets niet zeker, laat
   het dan op "?" staan**, zodat iedereen ziet dat het nog nagevraagd moet worden in plaats van
   dat er ten onrechte "Auto" staat.
4. Vink per regio het **type** aan. Een leverancier kan zowel **Dropshipment** als
   **E-fulfilment** zijn, als een deel van zijn producten bij PON op voorraad ligt. Bestellen we
   bij deze leverancier containers, vink dan **Containerinkoop** aan; hij komt dan in het aparte
   blok onderaan het overzicht.
5. Vul per regio de **frequentie** van de voorraad-sync en de **vervoerder(s)** in, als je die
   weet.
6. Zet bijzonderheden en uitzonderingen in **Uitleg bij deze leverancier**, en plak onder
   **Gekoppelde artikelen** de link van artikelen die bij deze leverancier horen.
7. Klik op **Opslaan**. De datum "laatst gecontroleerd" wordt daarmee op vandaag gezet.

---

## Veelgemaakte fouten

| Fout | Gevolg |
|---|---|
| Aannemen dat de leverweek overal vanzelf in Magento komt | Bij leveranciers met "Manual" blijft het veld leeg en weet niemand wanneer er geleverd wordt |
| Bij een leverancier met "Manual"-tracking wachten op automatische tracking | Die komt nooit; de order blijft openstaan en de klant hoort niets |
| "Half" behandelen als "Auto" | Een ontbrekende zending valt te laat op |
| Een "?" lezen als "gaat vanzelf" | Niemand heeft het gecontroleerd; het kan net zo goed handwerk zijn |
| Voor een UK-order in het tabblad Nederland & België kijken | De werkwijze en de vervoerder kunnen in de UK anders zijn |
| De vervoerder bellen in plaats van de toeleverancier | Wij hebben daar geen contract mee; je krijgt geen informatie en verliest tijd |
| Zelf op zoek gaan naar een verstuurde inkooporder buiten de mailbox | Alle kopieën staan in orders@marzansecurity.com → Inkooporders |

---

## Nog te controleren door Martijn

1. **UK-werkwijze.** In het tabblad Verenigd Koninkrijk staan alle statussen, types en
   vervoerders nog op "?". Hoe werken de UK-leveranciers, en hoe werken De Raat, BurgWachter,
   Gunnebo en Phoenix in de UK?
2. **Phoenix-tracking.** Loopt de recent geautomatiseerde tracking inmiddels stabiel? Dan kan
   de status van "Half" naar "Auto".
3. **Vervoerders in NL/BE.** Nog onbekend bij Anlag, Kniggendorf en Yale, welke pakketdienst
   Metain gebruikt, en wie de pallets van Kruse vervoert.
4. **Gunnebo-inkoopformulier.** De link `www.kluisstore.nl/media/po.html` is een voorlopige
   URL. Wordt die nog definitief?

---

_Gerelateerde artikelen: Voorraadsynchronisatie en levertijdlogica | Magento
backend-velden voor orderopvolging | Inkooporder plaatsen bij Gunnebo | Status van
bestelling — gespreksroute_
