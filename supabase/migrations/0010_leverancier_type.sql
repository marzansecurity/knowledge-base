-- Tweede filterdimensie op leveranciers: hoe ze werken (fulfilment, drop shipment,
-- installateur). Los van het land-filter, en net als bij landen mag een leverancier
-- meerdere types tegelijk hebben.

alter table suppliers
  add column types text[] not null default '{}',
  add constraint suppliers_types_check
    check (types <@ array['fulfilment', 'dropshipment', 'installateur']::text[]);

create index suppliers_types_idx on suppliers using gin (types);
