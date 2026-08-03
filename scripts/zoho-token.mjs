/**
 * Wisselt een Zoho-grantcode eenmalig om voor een refresh token.
 *
 *   node --env-file=.env.local scripts/zoho-token.mjs <grantcode>
 *
 * De grantcode haal je uit api-console.zoho.eu → je Self Client → Generate Code,
 * met scope Desk.articles.READ. Hij is maar een paar minuten geldig.
 */
const code = process.argv[2];
if (!code) {
  console.error('Geef de grantcode mee: node --env-file=.env.local scripts/zoho-token.mjs <code>');
  process.exit(1);
}

const clientId = process.env.ZOHO_CLIENT_ID;
const clientSecret = process.env.ZOHO_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error('ZOHO_CLIENT_ID en ZOHO_CLIENT_SECRET ontbreken in .env.local');
  process.exit(1);
}

const antwoord = await fetch('https://accounts.zoho.eu/oauth/v2/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
  }),
});

const data = await antwoord.json();

if (!data.refresh_token) {
  console.error('\nGeen refresh token ontvangen. Antwoord van Zoho:\n', data);
  console.error(
    '\nMeest voorkomende oorzaak: de grantcode is verlopen (geldig ~3 minuten) of al een keer gebruikt.',
  );
  process.exit(1);
}

console.log('\nGelukt. Zet deze regel in .env.local:\n');
console.log(`ZOHO_REFRESH_TOKEN=${data.refresh_token}\n`);
