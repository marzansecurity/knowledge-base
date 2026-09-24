-- Leveranciers waar we containers bestellen (bulk, via Phoenix: Diplomat,
-- Safewell). Geen tracking, en Martijn regelt dit zelf. Ze staan in een apart
-- blok onderaan het overzicht, zodat de backoffice ziet dat ze er niets mee hoeft.

alter table suppliers
  add column container_purchase boolean not null default false;