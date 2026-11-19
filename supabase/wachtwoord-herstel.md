# Wachtwoord vergeten: instellen in Supabase

De pagina's in de app (`/login/vergeten`, `/login/herstellen`, `/wachtwoord-resetten`) werken pas
als Supabase de herstelmail ook echt kan versturen en de link naar de app terugwijst. Dat stel je
eenmalig in het Supabase-dashboard in (project van de kennisbank, onder **Authentication**).
Er is geen database-migratie voor nodig.

## 1. Redirect-URL's toestaan

**Authentication → URL Configuration**

| Veld | Waarde |
|---|---|
| Site URL | `https://kb.marzansecurity.com` |
| Redirect URLs | `https://kb.marzansecurity.com/**` |
| Redirect URLs (lokaal testen) | `http://localhost:3000/**` |

Staat de redirect-URL niet op de lijst, dan valt Supabase terug op de Site URL en komt de
gebruiker op de verkeerde pagina uit.

## 2. Eigen mailserver (SMTP) instellen

**Authentication → Notifications → Emails → tabblad SMTP Settings → Enable Custom SMTP**

De ingebouwde mailserver van Supabase is bedoeld voor proberen: hij verstuurt maar een paar mails
per uur en alleen naar leden van het Supabase-team. Collega's krijgen hun herstelmail dus niet.
We gebruiken **smtp2go**, net als de werkbon-app.

1. Maak in smtp2go een **eigen SMTP-gebruiker** voor de kennisbank aan (Sending → SMTP Users).
   Hergebruik niet die van de werkbon-app: zo kun je de ene intrekken of de verzendingen apart
   volgen zonder de andere te raken.
2. Controleer dat het domein van het afzenderadres in smtp2go als verzenddomein is geverifieerd
   (Sending → Sender Domains). Een afzenderadres op een niet-geverifieerd domein wordt geweigerd.
3. Vul in Supabase in:

   | Veld | Waarde |
   |---|---|
   | Sender email | een adres op het geverifieerde domein, bijvoorbeeld `noreply@marzansecurity.com` |
   | Sender name | `Marzan Kennisbank` |
   | Host | `mail-eu.smtp2go.com` (het EU-account; staat op de pagina van de SMTP-gebruiker onder *Connecting via SMTP*) |
   | Port | `587` (TLS), of `465` (SSL) |
   | Username / Password | die van de nieuwe SMTP-gebruiker uit stap 1 |

Zet de gebruikersnaam en het wachtwoord alleen in het Supabase-dashboard, niet in de code of in
een chat.

## 3. E-mailtemplate vervangen

**Authentication → Notifications → Emails → tabblad Templates → Reset Password**

1. Zet als onderwerp bijvoorbeeld: `Nieuw wachtwoord voor de Marzan Kennisbank`
2. Plak de inhoud van [`email-templates/wachtwoord-herstellen.html`](email-templates/wachtwoord-herstellen.html)
   als berichttekst.

De link in dit template is anders dan de standaard, en dat is bewust:

- De app wisselt de link pas in als de gebruiker op de knop **Doorgaan** klikt. Mailscanners
  (zoals Safe Links van Microsoft) openen links vooraf; bij de standaardlink zou de eenmalige link
  dan al verbruikt zijn en zie je "link verlopen".
- De link werkt ook als de mail op een ander apparaat of in een andere browser wordt geopend dan
  waar de aanvraag is gedaan.

Laat je het standaardtemplate staan, dan werkt herstellen nog wel, maar alleen in dezelfde browser
als waarin het is aangevraagd, en de link kan door een mailscanner verbruikt worden.

## 4. Geldigheid van de link (optioneel)

De instelling **Email OTP Expiration** bepaalt hoe lang de link geldig is (te vinden bij de
e-mailinstellingen onder Authentication; de exacte plek kan per dashboardversie verschillen). De
standaard is een uur.

## Testen

1. Ga naar de loginpagina en klik op **Wachtwoord vergeten?**.
2. Vul het e-mailadres van een eigen account in.
3. Open de mail, klik op de link en dan op **Doorgaan**.
4. Kies een nieuw wachtwoord en log daarna in met dat wachtwoord.

## Gebruikers met twee-factor-authenticatie

Een account met 2FA vraagt na de herstellink eerst om de code uit de authenticator-app, en pas
daarna om het nieuwe wachtwoord. Is ook de authenticator-app kwijt, dan kan de gebruiker het niet
zelf herstellen en moet een beheerder het account resetten. Dat is bewust zo: anders zou toegang
tot alleen het e-mailaccount genoeg zijn om de tweede factor te omzeilen.

## Als de mail niet aankomt

- Controleer de spam.
- Supabase meldt een onbekend e-mailadres niet als fout. Dat is bewust, zodat niemand kan
  uitzoeken wie een account heeft. De app toont dus altijd dezelfde bevestiging.
- Kijk in het Supabase-dashboard onder **Logs → Auth** of de mail verstuurd is of een SMTP-fout gaf.
- Per e-mailadres kan Supabase maar eens per minuut een link versturen; de app toont dan de
  melding dat er net al een link is aangevraagd.
