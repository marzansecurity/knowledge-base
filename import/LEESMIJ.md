# Zoho-import

Eenmalige migratie van de Zoho Desk-kennisbank naar de nieuwe app. Geen doorlopende
synchronisatie: na de definitieve import is Zoho Desk een alleen-lezen archief.

## Eenmalig: toegang tot Zoho regelen

Het importscript heeft eigen leestoegang tot Zoho nodig. Dat regel je met een
"Self Client" — een koppeling zonder inlogscherm, bedoeld voor scripts.

1. Ga naar **[api-console.zoho.eu](https://api-console.zoho.eu)** — let op de `.eu`,
   je organisatie staat in de EU-datacenters.
2. Klik op **Self Client**. Is dit de eerste keer, dan vraagt Zoho om te bevestigen
   met **CREATE NOW**.
3. Ga naar het tabblad **Client Secret** en kopieer **Client ID** en **Client Secret**
   naar `.env.local`:

   ```
   ZOHO_CLIENT_ID=1000.XXXXXXXX
   ZOHO_CLIENT_SECRET=xxxxxxxxxxxx
   ```

4. Ga naar het tabblad **Generate Code** en vul in:

   | Veld | Waarde |
   |---|---|
   | Scope | `Desk.articles.READ` |
   | Scope Description | `kennisbank import` |
   | Time Duration | 10 minutes |

   Klik op **CREATE**, kies de portal **Marzan Security**, en klik nogmaals op
   **CREATE**. Kopieer de code die verschijnt.

5. Wissel die code binnen een paar minuten om voor een blijvend refresh token:

   ```
   node --env-file=.env.local scripts/zoho-token.mjs <de-code-die-je-kopieerde>
   ```

   Het script print één regel. Zet die in `.env.local`:

   ```
   ZOHO_REFRESH_TOKEN=1000.xxxxxxxx.xxxxxxxx
   ```

De grantcode uit stap 4 is maar een paar minuten geldig en werkt één keer. Verloopt
hij, dan maak je gewoon een nieuwe aan. Het refresh token uit stap 5 blijft geldig.

## De import draaien

```
# 1. Alles ophalen uit Zoho — schrijft de ruwe JSON weg, raakt de database niet aan
node --env-file=.env.local scripts/zoho-ophalen.mjs

# 2. Proefdraaien — conversie en reviewrapport, nog steeds zonder database
node --env-file=.env.local scripts/importeer.mjs --droogloop

# 3. Echt importeren, alles als draft
node --env-file=.env.local scripts/importeer.mjs
```

Stap 2 levert `import/reviewrapport.md` op. Lees dat voordat je stap 3 draait.

## Wat de scripts wel en niet doen

- **Niets wordt gepubliceerd.** Alle artikelen komen binnen met status `draft`.
  Publiceren doe je handmatig in de app.
- **De ruwe Zoho-JSON blijft bewaard** in `import/zoho-ruw/`, onaangeroerd naast de
  Markdown-conversie. Gaat er iets mis in de omzetting, dan is het origineel er nog.
- **Opnieuw draaien maakt geen duplicaten.** Elk artikel wordt herkend aan zijn
  Zoho-id. Is de inhoud onveranderd, dan wordt het overgeslagen.
- **Je eigen werk wordt niet overschreven.** Heb je een artikel al gepubliceerd of
  gearchiveerd, dan laat een nieuwe import het met rust en meldt het script dat.

## Bestanden in deze map

| Bestand | Wat het is |
|---|---|
| `categorie-mapping.csv` | Per artikel de nieuwe categorie en tags. Dit bestand mag je aanpassen. |
| `categorie-mapping.json` | Hetzelfde, voor machinegebruik. Wordt opnieuw gegenereerd door `scripts/maak-mapping.mjs`. |
| `zoho-artikelen.json` | Titel- en categorie-overzicht waarop de mapping is gebaseerd. |
| `zoho-ruw/` | De onbewerkte Zoho-JSON per artikel. |
| `reviewrapport.md` | Wordt gegenereerd door het importscript. |
