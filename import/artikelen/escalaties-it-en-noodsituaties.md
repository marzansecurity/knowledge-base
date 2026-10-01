---
titel: Wie bel je bij een storing? IT-escalaties en noodsituaties
categorie: systemen-applicaties
tags: escalatie-verplicht
samenvatting: Welke partij je belt bij welke storing: webshop plat, eigen bouwsel down, e-mail of virus, of een Zoho-storing. Inclusief de CC-regel die voorkomt dat meerdere collega's hetzelfde melden.
type: naslag
landen: alle
kanaal: alle
---

## In het kort

Bij een storing is de eerste vraag niet *wat* er kapot is, maar **wie het moet oplossen**. Dat verschilt per systeem, en het is geen kwestie van "even Martijn bellen" - voor drie van de vier routes is er een externe partij die je zelf direct kunt bereiken, ook als Martijn er niet is.

| Wat is er stuk? | Bel of mail |
| --- | --- |
| Een webshop (Magento) | **Hyper** |
| Iets wat wij zelf gebouwd hebben | **Martijn** |
| E-mail (marzansecurity.com), virus, phishing, laptop, Windows, programma installeren | **Lime Networks** |
| Zoho Desk of Zoho Voice | **Zoho support** |

> Dit overzicht is niet uitputtend. Komt er een situatie voorbij die er niet in staat, meld dat dan, zodat dit artikel aangevuld kan worden.

---

## Wanneer heb je dit nodig?

- Een website of webshop is niet bereikbaar, of de backend doet het niet.
- Je e-mail werkt niet meer, of je krijgt een virusmelding.
- Je hebt per ongeluk op een phishing-link geklikt.
- Zoho Desk of Zoho Voice is traag of plat.
- Martijn is niet bereikbaar en je moet zelf de juiste partij inschakelen.

---

## Route 1 — Een webshop (Magento) is down

**Geldt voor:** KluisStore.nl, KluisShop.be, LIPSBrandkasten.shop en SimplySafes.co.uk — frontend, backend, of allebei.

**Bel:** **Hyper** (onze webdeveloper) in Rijswijk. **Contactpersoon:** Iris van den Hout.

> [!WARNING] **Iris werkt niet op donderdag.** Is het donderdag, bel dan meteen het algemene nummer van Hyper — daar zitten voldoende mensen die het kunnen oppakken. Blijf niet wachten op een reactie van Iris; dat kost je een dag.

**Kies deze route NIET als** het om een van onze eigen bouwsels gaat (zie route 2). Hyper beheert alleen Magento (+extensies en plugins) en kan daar niets mee.

---

## Route 2 — Een eigen bouwsel is down

**Geldt voor:** alles wat wij zelf op de eigen, nieuwe stack hebben gebouwd:

- de werkbon-app
- de kennisbank
- het orderdashboard
- het eigen CRM
- Websites: marzansecurity.com, AccuKluis.nl, AccuKluis.be, [BatterySafety.co.uk](http://BatterySafety.co.uk), Kluis.eu

**Bel:** **Martijn**, rechtstreeks. Er is hier geen externe partij bij betrokken — er is dus ook niemand anders die dit kan oppakken.

**Kies deze route NIET als** het om een Magento-webshop gaat.

---

## Route 3 — E-mail, virus, phishing, laptop of Windows

**Geldt voor:**

- E-mail die niet meer werkt
- Een virusmelding
- Er is per ongeluk op een phishing-link geklikt
- Er moet een programma geïnstalleerd worden op mijn laptop
- Alles rond de Microsoft Office-inrichting, laptops en de Windows-installatie daarop — inclusief virusscanner-updates op afstand en het herstarten van een computer om updates te laden

**Bel of mail:** **Lime Networks** in Rotterdam. Er is **geen vaste contactpersoon**; gebruik het algemene contact.

> Heb je op een phishing-link geklikt: meld het meteen en probeer het niet eerst zelf op te lossen. Hoe eerder Lime Networks meekijkt, hoe kleiner de schade. Je krijgt hier geen standje voor — te laat melden is het probleem, niet de klik.

---

## Route 4 — Zoho Desk of Zoho Voice hapert

**Geldt voor:** storingen en traagheid in Zoho Desk of Zoho Voice.

**Mail:** het support-adres van Zoho.

> [!WARNING] **Zet vanaf het eerste bericht alle betrokken collega's in de CC** — ook Dan in de UK — als de storing iedereen raakt en niet alleen jou.

Waarom dit expliciet in dit artikel staat: dit is eerder misgegaan. Een storing werd gemeld met Rainer in de CC, maar zonder Dan. Een uur later meldde Dan hetzelfde probleem opnieuw, zonder te weten dat het al doorgegeven was. Dat levert dubbele tickets op, een trager antwoord van Zoho, en collega's die denken dat er niets gebeurt.

---

## Beslisboom

1. **Is het een webshop die klanten zien (KluisStore, KluisShop, LipsBrandkasten, SimplySafes)?** → Hyper. Donderdag: algemeen nummer.
2. **Nee — is het iets wat wij zelf gebouwd hebben (AccuKluis, kennisbank, werkbon-app, orderdashboard, CRM, Kluis.eu, marzansecurity.com)?** → Martijn.
3. **Nee — heeft het met Zoho Desk of Zoho Voice te maken?** → Zoho support, met brede CC.
4. **Nee — gaat het over e-mail, je laptop, Windows, een virus of phishing?** → Lime Networks.
5. **Past het nergens in?** → meld het bij Martijn en laat dit artikel aanvullen.

---

## Veelgemaakte fouten

| Fout | Gevolg |
| --- | --- |
| Op donderdag wachten op een reactie van Iris | Je verliest een dag terwijl Hyper het direct had kunnen oppakken |
| Hyper bellen voor een eigen bouwsel | Verkeerde partij, geen actie, tijdverlies bij een storing die klanten raken |
| Een Zoho-storing melden zonder brede CC | Collega's melden hetzelfde opnieuw; dubbele tickets en trager antwoord |
| Een phishing-klik eerst zelf proberen op te lossen | Hoe langer je wacht, hoe groter de schade |
| Wachten tot Martijn beschikbaar is bij een webshopstoring | Drie van de vier routes lopen niet via hem; je kunt zelf bellen |

---

## Nog te controleren door Martijn

1. **Contactgegevens.** Mogen de telefoonnummers en e-mailadressen van Hyper, Lime Networks en Zoho support hier concreet in? Nu staan alleen de namen, en dan moet iedereen het alsnog opzoeken.
2. **Zoho support.** Welk adres precies, en is dat per land verschillend?
3. **CC-lijst.** Wie hoort er standaard in de CC bij een Zoho-storing die iedereen raakt? Een vaste lijst is handiger dan "alle betrokkenen".
4. **Buiten kantooruren.** Is er voor een webshopstoring een spoednummer of SLA bij Hyper, en geldt die ook in het weekend?
5. **Route 2 bij afwezigheid.** Wat doe je als een eigen bouwsel down is en Martijn niet bereikbaar is? Nu is er geen alternatief benoemd.
6. **Volledigheid.** Welke systemen ontbreken nog? Denk aan Magento-koppelingen, telefonie buiten Zoho Voice, of de pinautomaat/showroom-apparatuur.

---

*Gerelateerde artikelen: Wanneer maak je een ticket aan — en wanneer niet | Medewerker spreken — gespreksroute bij escalatie*
