-- Nieuw rolniveau "editor" (redacteur), tussen medewerker en beheerder in.
--
-- Let op: dit bestand MOET los uitgevoerd worden, vóór 0007_redacteur_rechten.sql.
-- Postgres staat niet toe dat een nieuwe enum-waarde in dezelfde transactie wordt
-- gebruikt als waarin hij is toegevoegd — als je dit samen met 0007 in één keer
-- in de SQL Editor plakt en uitvoert, faalt 0007 met een foutmelding daarover.

alter type user_role add value if not exists 'editor';
