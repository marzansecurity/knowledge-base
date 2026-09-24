-- Leveranciersoverzicht als vervanger van de A/M-tabel uit het artikel
-- "Toeleveranciers — wat gaat automatisch en waar grijp je zelf in?". Per
-- leverancier vier onderdelen met elk een status, plus een detailpagina.
--
-- Status per onderdeel: auto / half / manual / nvt. Leeg (null) betekent
-- "nog niet ingevuld" — bewust geen standaardwaarde, zodat een nieuwe
-- leverancier niet stilzwijgend op "auto" komt te staan.

alter table suppliers
  add column slug                      text,
  add column purchase_order_status     text,
  add column order_confirmation_status text,
  add column tracking_status           text,
  add column stock_sync_status         text,
  -- Vrije tekst, bv. "ca. elk uur" of "1× per dag".
  add column stock_sync_frequency      text,
  -- Uitleg per leverancier op de detailpagina (Markdown, zelfde opmaak als artikelen).
  add column details_markdown          text,
  -- Slugs van gekoppelde kennisbank-artikelen, bv. het Gunnebo-inkoopproces.
  add column related_article_slugs     text[] not null default '{}',
  add constraint suppliers_purchase_order_status_check
    check (purchase_order_status in ('auto', 'half', 'manual', 'nvt')),
  add constraint suppliers_order_confirmation_status_check
    check (order_confirmation_status in ('auto', 'half', 'manual', 'nvt')),
  add constraint suppliers_tracking_status_check
    check (tracking_status in ('auto', 'half', 'manual', 'nvt')),
  add constraint suppliers_stock_sync_status_check
    check (stock_sync_status in ('auto', 'half', 'manual', 'nvt'));

-- Bestaande trackingvinkjes omzetten naar de nieuwe status. Geen van beide
-- aangevinkt zegt niets zekers, dus dat blijft leeg.
--
-- De oude kolommen tracking_available/tracking_automatic blijven bewust nog
-- staan: zo kan deze migratie draaien terwijl de vorige versie van de app nog
-- live staat. Opruimen in een latere migratie, zodra de nieuwe versie live is.
update suppliers
set tracking_status = case
  when tracking_automatic then 'auto'
  when tracking_available then 'manual'
  else null
end;

-- Slug voor de detailpagina (/leveranciers/<slug>). Wordt bij aanmaken één keer
-- gezet en daarna niet meer aangepast, zodat links blijven werken als de naam
-- wijzigt. Bestaande rijen krijgen er hier een; bij dubbele namen een volgnummer.
with basis as (
  select
    id,
    coalesce(nullif(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), ''), 'leverancier') as s,
    row_number() over (
      partition by coalesce(nullif(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), ''), 'leverancier')
      order by created_at
    ) as n
  from suppliers
)
update suppliers
set slug = case when basis.n = 1 then basis.s else basis.s || '-' || basis.n end
from basis
where suppliers.id = basis.id;

-- Vangnet voor inserts zonder slug (de vorige app-versie, losse scripts). De app
-- zelf geeft altijd een slug mee; dit vult alleen aan als die ontbreekt.
create function suppliers_vul_slug() returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := coalesce(nullif(trim(both '-' from regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g')), ''), 'leverancier');
    if exists (select 1 from suppliers where slug = new.slug) then
      new.slug := new.slug || '-' || left(new.id::text, 6);
    end if;
  end if;
  return new;
end;
$$;

create trigger suppliers_vul_slug before insert on suppliers
  for each row execute function suppliers_vul_slug();

alter table suppliers
  alter column slug set not null,
  add constraint suppliers_slug_key unique (slug);
