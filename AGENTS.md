<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices. Middleware heet hier `proxy` (`src/proxy.ts`).

# Waarom deze kennisbank bestaat

Martijn geeft elke nieuwe medewerker persoonlijk dezelfde uitleg over systemen, werkwijze en procedures. Die uitleg wordt hier één keer vastgelegd, zó dat iemand er zelf in kan opzoeken hoe iets werkt — "in zijn hoofd kruipen". De kennisbank rust op drie pijlers: procedures en werkwijzes (inclusief leveranciers en hun manuals), systemen, en producttrainingen.

Daaruit volgt de norm waaraan elk artikel voldoet: **het neemt de lezer aan de hand** — doe dit, doe dat, klik hier, klik daar — precies zoals Martijn het mondeling doet. De vorige kennisbank was platte tekst en las daardoor moeilijk weg; dat is exact wat hier niet mag terugkomen. Een artikel dat klopt maar niet begeleidt, is nog niet af.

# Artikelen: de vier typen en hun sjabloon

Elk artikel heeft een `type` (enum op `articles`) en een `owner_id` — allebei verplicht bij het aanmaken van een nieuw artikel, ook vanuit scripts en AI-voorstellen. Het type bepaalt het sjabloon; afwijken mag, maar dan bewust.

**gespreksroute** — klant zegt X → welke vragen stel je, welke takken zijn er.
Geldig voor · beslisboom met genummerde stappen en expliciete takken · `> [!WARNING]`-blokken voor harde grenzen · doorzetten naar een medewerker · wat leg je vast · gerelateerde artikelen. De 16 routes in `import/gespreksroutes/` zijn de standaard.

**procedure** — hoe voer je iets uit in een systeem, stap voor stap.
In het kort · wanneer heb je dit nodig · de stappen (genummerd, per stap: wat je doet + waarom + valkuil) · veelgemaakte fouten (tabel: fout | gevolg) · gerelateerde artikelen.

**naslag** — wat betekent iets, en hoe kies je.
In het kort · wanneer heb je dit nodig · de opties (per optie: wat het is | kies dit als | **kies dit NIET als** — dat laatste is verplicht, daar zit de kennis) · beslisboom · veelgemaakte fouten · gerelateerde artikelen.

**producttraining** — vakkennis om te kunnen adviseren.
In het kort · waarom dit uitmaakt voor de klant · de basis (klantenservice) · verdieping (monteurs/gevorderden) · hoe adviseer je ("als de klant X zegt, dan meestal Y, tenzij Z") · veelgemaakte fouten · gerelateerde artikelen. Gelaagd binnen één artikel, niet gesplitst per doelgroep.
Onderwerpen: normen, kluiskeuze, sloten, sleutels, installatieservice — alles wat nodig is om inhoudelijk te adviseren, technisch én niet-technisch. **Geen commercie:** kortingen, marges, inkoopprijzen en onderhandelingsruimte horen hier niet in. Advies wel, de commerciële afweging niet.

Verdere regels:

- **Scope is data, geen proza.** `countries` (NL/BE/UK, leeg = overal) en `channel` staan op het artikel; de zichtbare "Geldig voor"-regel wordt daaruit gegenereerd. Typ hem niet met de hand in de tekst.
- **De kennis zit in de uitzonderingen.** Valkuilen, "kies dit niet als", en wat er misgaat als je het fout doet horen in elk artikel.
- **Voorbeeld en regel scheiden.** Bedragen en namen uit een concreet geval markeren als voorbeeld, nooit als regel opschrijven. Gedicteerde getallen altijd expliciet terugvragen.
- **Eén onderwerp per artikel.** Bevat een transcript of tekst meerdere onderwerpen: splitsen, niet inbouwen.
- **Ontbrekende informatie** komt als genummerde open vragen onderaan het artikel (kop "Nog te controleren door Martijn"), niet in een aparte mail. Het artikel blijft `draft` tot die beantwoord en verwerkt zijn.
<!-- END:nextjs-agent-rules -->
