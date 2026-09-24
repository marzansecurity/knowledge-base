-- Leveranciers per regio. Nederland en België werken hetzelfde en vormen één
-- regio; de UK werkt anders. Eén leverancier kan in beide regio's actief zijn,
-- met per regio eigen statussen, vervoerder, type en toelichting — bv. De Raat
-- is in de UK minder geautomatiseerd en gebruikt daar een andere vervoerder.
--
-- De velden op suppliers zelf (countries, types, de statussen, carrier, notes,
-- tracking_available/tracking_automatic) blijven bewust nog staan, zodat de
-- vorige app-versie blijft werken tot deze live staat. Opruimen in een latere
-- migratie.

create table supplier_regions (
  id                        uuid        primary key default gen_random_uuid(),
  supplier_id               uuid        not null references suppliers (id) on delete cascade,
  region                    text        not null,
  types                     text[]      not null default '{}',
  stock_sync_status         text,
  stock_sync_frequency      text,
  purchase_order_status     text,
  order_confirmation_status text,
  carrier                   text,
  tracking_status           text,
  -- Korte toelichting, zichtbaar in het overzicht.
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint supplier_regions_uniek unique (supplier_id, region),
  constraint supplier_regions_region_check check (region in ('nlbe', 'uk')),
  constraint supplier_regions_types_check
    check (types <@ array['fulfilment', 'dropshipment', 'installateur']::text[]),
  constraint supplier_regions_stock_sync_status_check
    check (stock_sync_status in ('auto', 'half', 'manual', 'nvt')),
  constraint supplier_regions_purchase_order_status_check
    check (purchase_order_status in ('auto', 'half', 'manual', 'nvt')),
  constraint supplier_regions_order_confirmation_status_check
    check (order_confirmation_status in ('auto', 'half', 'manual', 'nvt')),
  constraint supplier_regions_tracking_status_check
    check (tracking_status in ('auto', 'half', 'manual', 'nvt'))
);

create index supplier_regions_region_idx on supplier_regions (region);

create trigger supplier_regions_touch before update on supplier_regions
  for each row execute function touch_updated_at();

alter table supplier_regions enable row level security;

create policy supplier_regions_select on supplier_regions
  for select using (is_active_user());

create policy supplier_regions_editor on supplier_regions
  for all using (is_editor_or_admin()) with check (is_editor_or_admin());

-- Vanuit welk land de leverancier opereert (ISO-landcode, bv. DE), en of het om
-- onze eigen voorraad gaat (PON) — die staat bovenaan in een eigen kleur.
alter table suppliers
  add column based_in  text,
  add column own_stock boolean not null default false,
  add constraint suppliers_based_in_check check (based_in ~ '^[A-Z]{2}$');

-- Bestaande gegevens overzetten. NL/BE (of geen land ingevuld) wordt de regio
-- nlbe, met alles wat er al stond.
insert into supplier_regions (
  supplier_id, region, types, stock_sync_status, stock_sync_frequency,
  purchase_order_status, order_confirmation_status, carrier, tracking_status, notes
)
select
  id, 'nlbe', types, stock_sync_status, stock_sync_frequency,
  purchase_order_status, order_confirmation_status, carrier, tracking_status, notes
from suppliers
where countries && array['NL', 'BE']::text[] or countries = '{}';

-- Alleen UK: de bestaande gegevens horen dan bij de UK.
insert into supplier_regions (
  supplier_id, region, types, stock_sync_status, stock_sync_frequency,
  purchase_order_status, order_confirmation_status, carrier, tracking_status, notes
)
select
  id, 'uk', types, stock_sync_status, stock_sync_frequency,
  purchase_order_status, order_confirmation_status, carrier, tracking_status, notes
from suppliers
where 'UK' = any (countries) and not (countries && array['NL', 'BE']::text[]);

-- UK náást NL/BE: de UK werkt anders, dus daar alleen de regio aanmaken en de
-- statussen open laten ("nog niet ingevuld") in plaats van ze te kopiëren.
insert into supplier_regions (supplier_id, region, types)
select id, 'uk', types
from suppliers
where 'UK' = any (countries) and countries && array['NL', 'BE']::text[];
