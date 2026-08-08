-- Zoeken in de gevraagde taal, met terugval op het Nederlands.
--
-- Zelfde opzet als 0003_zoekfunctie.sql: woordstammen via to_tsvector plus
-- tolerantie voor tikfouten via pg_trgm. Nieuw is dat de woordenboekconfiguratie
-- meebeweegt met de taal, en dat er in article_translations gezocht wordt.
--
-- security invoker (de standaard) zorgt dat Row Level Security gewoon geldt:
-- een medewerker krijgt hier dus nooit een draft uit.

-- De oude 1-argument-versie eerst weg: `create or replace` zou een overload
-- maken en dan wordt de bestaande aanroep uit src/lib/data.ts dubbelzinnig.
drop function if exists zoek_artikelen(text);

-- Bewust géén default op `taal`: met een default zou de aanroep met één
-- argument dubbelzinnig worden tegenover de brugfunctie onderaan dit bestand.
create or replace function zoek_artikelen(zoekterm text, taal text)
returns table (
  id          uuid,
  slug        text,
  title       text,
  summary     text,
  status      article_status,
  category_id uuid,
  reviewed_at timestamptz,
  locale      text,
  is_terugval boolean,
  rang        real
)
language sql
stable
as $$
  with vraag as (
    select
      case taal
        when 'en' then 'english'::regconfig
        when 'fr' then 'french'::regconfig
        when 'de' then 'german'::regconfig
        else           'dutch'::regconfig
      end                    as cfg,
      lower(btrim(zoekterm)) as term
  ),
  -- Per artikel de gevraagde taal, of anders de Nederlandse versie.
  gekozen as (
    select distinct on (t.article_id) t.*
    from article_translations t
    where t.locale::text in (taal, 'nl')
    order by t.article_id, (t.locale::text = taal) desc
  )
  select
    a.id,
    g.slug,
    g.title,
    g.summary,
    a.status,
    a.category_id,
    a.reviewed_at,
    g.locale::text,
    g.locale::text <> taal as is_terugval,
    greatest(
      ts_rank(g.search_vector, websearch_to_tsquery(v.cfg, zoekterm)) * 4,
      word_similarity(v.term, g.title) * 2,
      similarity(g.title, v.term) * 2,
      word_similarity(v.term, coalesce(g.summary, '')),
      case when g.content_markdown ilike '%' || v.term || '%' then 0.5 else 0 end
    )::real as rang
  from gekozen g
  join articles a on a.id = g.article_id,
       vraag v
  where btrim(zoekterm) <> ''
    and (
      g.search_vector @@ websearch_to_tsquery(v.cfg, zoekterm)
      or word_similarity(v.term, g.title) > 0.45
      or similarity(g.title, v.term) > 0.3
      or g.title ilike '%' || v.term || '%'
      or g.content_markdown ilike '%' || v.term || '%'
    )
  order by rang desc, g.title
  limit 60;
$$;

grant execute on function zoek_artikelen(text, text) to authenticated;

-- Tijdelijke brug zodat de huidige app (die met één argument aanroept) blijft
-- werken tot src/lib/data.ts is omgezet. Verwijderen zodra dat gebeurd is:
--   drop function zoek_artikelen(text);
create or replace function zoek_artikelen(zoekterm text)
returns table (
  id          uuid,
  slug        text,
  title       text,
  summary     text,
  status      article_status,
  category_id uuid,
  reviewed_at timestamptz,
  rang        real
)
language sql
stable
as $$
  -- Alles via de alias z: de kolomnamen uit `returns table` staan hier ook als
  -- variabele in scope, dus ongekwalificeerd zou dubbelzinnig zijn.
  select z.id, z.slug, z.title, z.summary, z.status, z.category_id, z.reviewed_at, z.rang
  from zoek_artikelen(zoekterm, 'nl') z;
$$;

grant execute on function zoek_artikelen(text) to authenticated;

-- Let op: een artikel dat alleen in het Nederlands bestaat wordt doorzocht met
-- de woordenboekconfiguratie van de gevraagde taal. De stemming is dan zwakker;
-- trigram-gelijkenis en ilike vangen dat op.
