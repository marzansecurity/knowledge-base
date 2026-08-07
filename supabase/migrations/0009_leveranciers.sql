-- Leveranciers-overzicht: welke vervoerder een leverancier gebruikt, of er
-- tracking beschikbaar is, en of die automatisch bij ons binnenkomt. Eén
-- centrale, filterbare tabel voor NL/BE/UK samen — geen los kennisbank-artikel,
-- omdat dit operationele naslagdata is die moet kunnen filteren/sorteren.

create table suppliers (
  id                  uuid primary key default gen_random_uuid(),
  name                text        not null,
  -- Welke landen deze leverancier bedient; een leverancier mag in meerdere landen zitten.
  countries           text[]      not null default '{}',
  carrier             text,
  tracking_available  boolean     not null default false,
  tracking_automatic  boolean     not null default false,
  notes               text,
  reviewed_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid        references profiles (user_id) on delete set null,
  updated_by          uuid        references profiles (user_id) on delete set null,
  constraint suppliers_countries_check check (countries <@ array['NL', 'BE', 'UK']::text[])
);

create index suppliers_countries_idx on suppliers using gin (countries);
create index suppliers_name_trgm_idx on suppliers using gin (name gin_trgm_ops);

create trigger suppliers_touch before update on suppliers for each row execute function touch_updated_at();

alter table suppliers enable row level security;

-- Iedere actieve, ingelogde gebruiker mag het overzicht lezen.
create policy suppliers_select on suppliers
  for select using (is_active_user());

-- Alleen redacteuren en beheerders mogen leveranciers toevoegen/wijzigen/verwijderen.
create policy suppliers_editor on suppliers
  for all using (is_editor_or_admin()) with check (is_editor_or_admin());
