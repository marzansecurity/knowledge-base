-- Opschonen van oude, niet meer gebruikte inlogsessies (auth.sessions).
--
-- Supabase verwijdert verlopen sessies niet automatisch uit de database — een
-- sessie die niet meer vernieuwd wordt (bv. omdat iemand nooit is uitgelogd op
-- een oude laptop) blijft voor altijd in auth.sessions staan. We ruimen sessies
-- op die al meer dan 30 dagen niet meer zijn gebruikt; dat is ruim voorbij de
-- normale duur van een refresh-token, dus zo'n sessie werkt toch al niet meer.
--
-- Dit bestand doet twee dingen:
--   1) Eenmalig opschonen van wat er nu al aan oude sessies ligt.
--   2) Een maandelijkse cron-taak instellen die dit voortaan automatisch blijft doen.

-- ---------------------------------------------------------------------------
-- 1) Eenmalige opschoning
-- ---------------------------------------------------------------------------

delete from auth.sessions
where updated_at < now() - interval '30 days';

-- ---------------------------------------------------------------------------
-- 2) Automatisch blijven opschonen, elke 1e van de maand om 03:00 UTC
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;

select cron.schedule(
  'opschonen-oude-sessies',
  '0 3 1 * *',
  $$ delete from auth.sessions where updated_at < now() - interval '30 days'; $$
);
