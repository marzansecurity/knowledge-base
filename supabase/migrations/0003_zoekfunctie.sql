-- Zoeken met Nederlandse woordstammen én tolerantie voor tikfouten.
--
-- Nodig omdat PostgREST de trigram-operatoren van pg_trgm niet zelf aanbiedt.
-- security invoker (de standaard) zorgt dat Row Level Security gewoon geldt:
-- een medewerker krijgt hier dus nooit een draft uit.

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
  with vraag as (
    select
      websearch_to_tsquery('dutch', zoekterm) as tsq,
      lower(btrim(zoekterm))                  as term
  )
  select
    a.id,
    a.slug,
    a.title,
    a.summary,
    a.status,
    a.category_id,
    a.reviewed_at,
    greatest(
      ts_rank(a.search_vector, v.tsq) * 4,
      word_similarity(v.term, a.title) * 2,
      similarity(a.title, v.term) * 2,
      word_similarity(v.term, coalesce(a.summary, '')),
      case when a.content_markdown ilike '%' || v.term || '%' then 0.5 else 0 end
    )::real as rang
  from articles a, vraag v
  where btrim(zoekterm) <> ''
    and (
      a.search_vector @@ v.tsq
      or word_similarity(v.term, a.title) > 0.45
      or similarity(a.title, v.term) > 0.3
      or a.title ilike '%' || v.term || '%'
      or a.content_markdown ilike '%' || v.term || '%'
    )
  order by rang desc, a.title
  limit 60;
$$;

grant execute on function zoek_artikelen(text) to authenticated;

-- pg_trgm's drempel voor de %-operator staat standaard op 0.3; dat is voor
-- losse woorden in lange titels te streng. word_similarity gebruiken we
-- daarom expliciet met een eigen drempel in de query hierboven.
