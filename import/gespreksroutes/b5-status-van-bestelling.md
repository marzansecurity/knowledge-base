---
titel: Status van bestelling — gespreksroute
categorie: orderverwerking
tags: gespreksroute, magento
samenvatting: Hoe je een orderstatus uit Magento vertaalt naar klanttaal, en wanneer een ontbrekende track & trace wel of niet reden is om te escaleren.
---

**Geldig voor: KluisStore.nl — klantcontact (chat, telefoon, e-mail)**
"Waar blijft mijn bestelling?" De status staat in Magento, maar die naam zegt de klant niets. Dit artikel geeft per status de omschrijving die je wél gebruikt, en de regels voor wanneer een ontbrekende track & trace reden is om te escaleren.

> [!WARNING]
> **Gebruik nooit de exacte statusnaam uit Magento tegen de klant.** Beschrijf wat de klant kan verwachten.

---

## Stap 1 — Order ophalen

Vraag naar e-mailadres en order- of factuurnummer — alleen als die nog niet bekend en bevestigd zijn in dit gesprek — en zoek de order op. Controleer of het veld bedrijfsnaam is ingevuld: ingevuld = zakelijk, leeg = particulier.

### Bestelling niet gevonden

Bijna altijd een typefout. Leg uit dat de bestelling met deze combinatie van gegevens niet gevonden is, en vraag de klant het e-mailadres en het nummer nog een keer na te kijken.

Stel in deze stap **geen enkele andere vraag** en bied **nog geen** doorzetten naar een medewerker aan. Corrigeert de klant iets, zoek dan opnieuw op.

Blijft de klant erbij dat de gegevens kloppen? Bied dan wél aan het door te zetten voor extra controle. Zie: Klantgegevens verifiëren bij het opzoeken van een order.

---

## Stap 2 — Status vertalen naar klanttaal

| Status in Magento | Wat je tegen de klant zegt |
|---|---|
| **Pending** | Bestelling is geplaatst maar nog niet betaald. De orderbevestiging is per e-mail verstuurd. Afhankelijk van de betaalmethode wordt de bestelling handmatig doorgezet en verwerkt. |
| **E-fulfilment / Dropshipment / Combination** | Track & trace volgt per e-mail zodra de zending verstuurd is. Zie hieronder als er nog geen track & trace is. |
| **Installation to be planned / planned** | Order met installatie of speciale instructies. Dit is een speciaal traject met opvolging en afstemming tussen klant en servicepartner. Er is geen track & trace; de afspraak wordt telefonisch of per e-mail vastgelegd. |
| **Service to be planned / planned** | Serviceorder, bijvoorbeeld ombouw van een slot op locatie of het openen van een kluis. Zelfde traject als bij installatie: geen track & trace, afspraak wordt vastgelegd. |
| **Complete** | Bestelling is afgerond. Orderbevestiging en factuur zijn per e-mail verstuurd, de verzending is ingeboekt en het product is verstuurd of overgedragen aan de vervoerder. Track & trace indien beschikbaar. |
| **Closed** | Bestelling is geheel gecrediteerd. |

De volledige interne betekenis van alle statussen en labels staat in Orderstatussen & labels in Magento.

---

## Geen track & trace beschikbaar

Check het bestelmoment. Dit is de regel:

- **Besteld na 20:00 gisteren en vóór 20:00 nu** → stel de klant gerust: de bestelling wordt de volgende werkdag verwerkt en de track & trace volgt automatisch per e-mail. Noem geen exact tijdstip. Niets vastleggen.
- **Langer dan 24 uur geleden besteld, nog geen track & trace** → vraag of de klant het door wil laten zetten naar een medewerker.

---

## Bij installatie- of service-orders: vraag eerst wat de klant wil weten

Informeer de klant over het traject en vraag daarna **eerst** wat die precies wil weten, voordat je iets in gang zet. Veel klanten willen alleen weten of het loopt.

Zet het alleen door als de klant aangeeft dat er nog **geen contact** is geweest, of wil weten **wanneer de afspraak wordt ingepland**.

---

## Klant was niet thuis of wil een bezorginstructie doorgeven

Ga over naar Aflevering en bezorgvoorkeuren doorgeven — gespreksroute.

---

## Contactgegevens bij doorzetten

Gebruik het bekende e-mailadres. Staat er voor deze klant al een telefoonnummer in Magento, gebruik dat dan ook — vraag er niet opnieuw naar. Alleen als er geen telefoonnummer bekend is, vraag je er hier naar.

## Wat leg je vast

Afhankelijk van de situatie:

**Bestelling niet gevonden:** het door de klant opgegeven order- of factuurnummer, particulier of zakelijk, korte samenvatting van de vraag. Bleek één gegeven wél bekend in Magento? Vermeld dat als mogelijke typefout.

**Geen track & trace, langer dan 24 uur:** ordernummer, productnaam indien bekend, particulier of zakelijk, en de constatering dat de klant nog geen track & trace heeft ontvangen bij een bestelling van meer dan 24 uur oud.

**Vraag over installatie- of service-afspraak:** ordernummer, productnaam indien bekend, particulier of zakelijk, en precies wat de klant wil weten over de afspraak.

---

_Gerelateerde artikelen: Orderstatussen & labels in Magento — overzicht voor nieuwe medewerkers | Hoe verloopt een bestelling, status Magento | Waar blijft mijn bestelling / service? | Track en Trace wordt niet automatisch weergegeven in order | Klant informeren levertijd (proactief) | Aflevering en bezorgvoorkeuren doorgeven — gespreksroute | Opvolging installatie-orders — stap voor stap_
