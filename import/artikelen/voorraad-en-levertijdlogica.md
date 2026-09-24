---
titel: Voorraadsynchronisatie en levertijdlogica
categorie: verzending-magazijnen
tags: dropshipment, magento
samenvatting: Hoe de voorraad bij de toeleverancier bepaalt welke levertijd Magento aan de klant belooft, waarom wij bewust ruimer communiceren dan technisch haalbaar is, en de valkuil bij orders met meerdere artikelen.
type: naslag
landen: alle
kanaal: alle
---

## In het kort

De voorraadpositie bij de toeleverancier bepaalt **rechtstreeks** welke levertijd Magento
aan de klant belooft. Er zit geen mens tussen: de synchronisatie voedt de rekenmodule, de
rekenmodule vult de beloofde levertijd.

Drie dingen die je daarover moet weten:

1. **Op voorraad** → korte levertijd, maar wij communiceren bewust **ruimer** dan
   technisch haalbaar is.
2. **Niet op voorraad** → er wordt teruggevallen op een **handmatig ingestelde
   fallback-levertijd** per product.
3. **Meerdere artikelen in één order** → Magento neemt de **kórtste** levertijd voor de
   hele order. Dat is de belangrijkste valkuil in dit artikel.

---

## Wanneer heb je dit nodig?

- Een klant vraagt wanneer zijn bestelling geleverd wordt en je wilt weten hoe hard die
  datum is.
- Je twijfelt of een beloofde levertijd klopt, bijvoorbeeld bij een order met meerdere
  artikelen.
- Een leverancier blijkt toch niet te kunnen leveren en je moet uitleggen hoe dat kon.
- Je moet inschatten of je een levertijd hard mag toezeggen of beter een slag om de arm
  houdt.

---

## Hoe de voorraadsynchronisatie werkt

Wij vragen toeleveranciers om hun voorraad met ons te delen. Twee dingen om te weten:

- **Niet elke leverancier doet dit.**
- **Niet elke leverancier deelt exacte aantallen.** Sommigen geven alleen een ja/nee of een
  kleurcode (bijvoorbeeld rood/groen), omdat exacte aantallen concurrentiegevoelig zijn.

Het systeem in Magento is gebouwd om met al die vormen om te gaan: aantallen, kleuren én
tekst.

**Per leverancier** of er een voorraadkoppeling is en hoe vaak die synchroniseert, staat in
het **[leveranciersoverzicht](/nl/leveranciers)**, in de kolom *Voorraad-sync*. Ter
illustratie: bij Nauta en De Raat is dat ongeveer elk uur, bij Phoenix één keer per dag, en
BurgWachter heeft geen koppeling nodig omdat de producten nagenoeg altijd op voorraad zijn.

---

## Als het artikel op voorraad is

### De Raat en Nauta

Bij deze twee geldt een **vaste dagelijkse afhaaltijd** door vervoerder Transmission, rond
een uur of vier 's middags. Alles wat vóór ongeveer half drie à drie uur besteld wordt en
op voorraad staat, gaat dezelfde dag nog mee en wordt de volgende werkdag geleverd.

> [!WARNING]
> **Beloof dat niet zo aan de klant.** Officieel is het "vandaag besteld, morgen
> geleverd", maar omdat de leverbetrouwbaarheid in de logistiek al jaren onder druk staat,
> communiceert de webshop bewust **1 tot 2 werkdagen**. Dat is geen slordigheid maar
> ingebouwde speling — neem die dus over in je gesprek en maak er niet alsnog "morgen" van.

**In België** geldt die marge van 1 tot 2 dagen al langer. Het Transmission-netwerk heeft
daar maar gedeeltelijk eigen dekking: voor regio's zonder eigen dekking — verder van
Antwerpen, richting de Ardennen bijvoorbeeld — wordt de zending overgedragen aan een
Transmission-partner. Dat is een extra schakel, en dus een extra bron van vertraging.

### Phoenix en Kruse (beide Duitsland)

Hier bestaat "vandaag besteld, morgen geleverd" **niet**. De zending legt een langere weg
af: Duits distributiecentrum → Nederlands distributiecentrum → regionale verdeling →
aflevering. Daar komt bij:

- Phoenix heeft **niet elke dag** een afhaling door zowel GLS als Schenker; welke vervoerder
  wanneer wordt ingezet, hangt af van het type en het gewicht van de zending.
- **Een weekend telt mee** in de doorlooptijd: er wordt in het weekend nog wel verdeeld,
  maar niet opgehaald. Een order van vrijdag kan daardoor maandag geleverd worden — in
  kalenderdagen lijkt dat lang, in werkdagen is het normaal.

Daarom werken we bij Phoenix en Kruse met een bandbreedte van **circa 4 tot 5 dagen** in
plaats van een harde belofte. Leg dat ook zo uit aan een klant die zich afvraagt waarom
het langer duurt dan bij een Nederlandse leverancier.

---

## Als het artikel niet op voorraad is

Dan valt het systeem terug op een **fallback-levertijd**: een per product handmatig
ingestelde termijn, gebaseerd op kennis en ervaring — bijvoorbeeld hoe lang het gemiddeld
duurt om het artikel opnieuw bij de fabrikant te bestellen. Denk aan 4 tot 6 weken.

**Waarom handmatig?** Omdat de toeleverancier zelf vooraf geen betrouwbare, actuele
levertijd deelt. Het kan best zijn dat een artikel toevallig al onderweg is en dus veel
sneller beschikbaar komt dan de fallback aangeeft — maar die informatie hebben wij niet.
De fallback is daarom bewust een **"worst case, maar realistisch"**-bericht.

Dat betekent voor je gesprek: een lange fallback-levertijd is geen toezegging dat het
zó lang duurt, maar je mag er ook niet overheen beloven dat het sneller kan.

---

## De belangrijkste valkuil: orders met meerdere artikelen

> [!WARNING]
> Bevat een order twee artikelen met verschillende levertijden, dan hanteert Magento **de
> kortste levertijd voor de hele order.**

Een voorbeeld: artikel A heeft een fallback-levertijd van 4 tot 6 weken (niet op
voorraad), artikel B is morgen leverbaar (wel op voorraad). De klant ziet dan de korte
levertijd van artikel B staan — terwijl zijn order pas compleet is als artikel A er ook
is.

Dit gebeurt vaker dan je denkt, bijvoorbeeld wanneer er een discrete verpakking of een
ander klein artikel is meebesteld dat toevallig wél op voorraad ligt.

**Wat je doet:** kijk bij een order met meerdere regels altijd of de beloofde levertijd
past bij het **langzaamste** artikel, niet bij wat er in het veld staat. Klopt dat niet,
informeer de klant dan actief — anders hoort hij het pas als zijn bestelling uitblijft.

---

## Risico bij storingen

De voorraadsynchronisatie voedt rechtstreeks de rekenmodule. Valt die synchronisatie stil,
geeft hij fouten, of heeft de leverancier zelf verkeerd geteld, dan belooft Magento
gewoon door — met een levertijd die niet haalbaar is.

Ga er dus niet vanuit dat een getoonde levertijd per definitie klopt. Twijfel je, of gaat
het om een belangrijke toezegging, **controleer dan eerst of de synchronisatie van die
leverancier actueel is** voordat je de datum hard communiceert.

---

## Veelgemaakte fouten

| Fout | Gevolg |
|---|---|
| "Morgen in huis" beloven bij een op-voorraad-artikel van De Raat of Nauta | De webshop houdt bewust 1-2 werkdagen aan; jij zet de klant op het verkeerde been |
| Een Nederlandse levertijd aanhouden voor een Belgische klant buiten het eigen netwerk | Extra schakel in het vervoer, dus structureel meer kans op vertraging |
| Bij Phoenix of Kruse in kalenderdagen rekenen | Het weekend telt mee in de distributie; het lijkt trager dan het is |
| Bij een order met meerdere artikelen de getoonde levertijd overnemen | Magento toont de kortste; de klant wacht in werkelijkheid op het traagste artikel |
| De fallback-levertijd als harde uiterste datum presenteren | Het is een worst case-inschatting, geen toezegging van de leverancier |
| Een levertijd hard toezeggen zonder te checken of de sync actueel is | Bij een hapering belooft het systeem iets wat niet gehaald kan worden |

---

## Nog te controleren door Martijn

1. **Afhaaltijden.** Klopt "afhaling rond 16:00 door Transmission, besteld vóór circa
   14:30-15:00" nog voor De Raat en Nauta?
2. **Bandbreedtes.** Zijn 1-2 werkdagen (NL, op voorraad) en 4-5 dagen (Phoenix/Kruse) de
   actuele getallen die we naar klanten communiceren?
3. **Fallback.** Is 4-6 weken een representatief voorbeeld, of hebben we een gangbaarder
   bereik dat hier als voorbeeld kan staan?
4. **België.** Geldt de marge van 1-2 dagen daar overal, of alleen buiten de eigen dekking
   van Transmission? En waar ligt die grens ongeveer?
5. **Meerdere artikelen.** Is de "kortste levertijd wint"-regel een bewuste keuze of een
   beperking die nog opgelost gaat worden? Dat bepaalt of dit een valkuil blijft of
   tijdelijk is.
6. **Controle op de sync.** Waar kan een medewerker zelf zien of de voorraadsynchronisatie
   van een leverancier actueel is? Nu staat er "controleer dat", maar niet hoe.
7. **Scope.** Gelden dezelfde regels en bandbreedtes voor de UK-webshop?

---

_Gerelateerde artikelen: Toeleveranciers — wat gaat automatisch en waar grijp je zelf in? |
Magento backend-velden voor orderopvolging | Status van bestelling — gespreksroute_
