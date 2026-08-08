-- Meertalige artikelen: Nederlands, Engels en Frans (Duits volgt later).
--
-- Opzet: `articles` blijft de Nederlandse bronwaarheid — de Zoho-import, de
-- editor, de export en de revisies schrijven daar gewoon naartoe. Een trigger
-- spiegelt elke wijziging naar de 'nl'-rij in `article_translations`, zodat
-- alle LEESpaden één uniforme vorm krijgen (er is altijd een nl-rij) terwijl
-- geen enkel SCHRIJFpad hoeft te wijzigen.
--
-- De Nederlandse kolommen op `articles` kunnen in een latere migratie weg,
-- zodra niets ze meer rechtstreeks leest.

create type article_locale as enum ('nl', 'en', 'fr');

-- ---------------------------------------------------------------------------
-- Vertalingen
-- ---------------------------------------------------------------------------

create table article_translations (
  article_id       uuid           not null references articles (id) on delete cascade,
  locale           article_locale not null,
  slug             text           not null,
  title            text           not null,
  summary          text,
  content_markdown text           not null default '',
  -- 'concept' = AI-vertaling die nog nagekeken moet worden.
  review_state     text           not null default 'concept'
                     check (review_state in ('concept', 'nagekeken')),
  -- Het Nederlandse artikel is gewijzigd ná deze vertaling: opnieuw nakijken.
  stale            boolean        not null default false,
  search_vector    tsvector,
  created_at       timestamptz    not null default now(),
  updated_at       timestamptz    not null default now(),
  updated_by       uuid           references profiles (user_id) on delete set null,
  primary key (article_id, locale)
);

-- Per taal mag een slug maar één keer voorkomen; dezelfde slug in een andere
-- taal is prima (en is na de backfill hieronder ook precies wat er staat).
create unique index article_translations_slug_idx
  on article_translations (locale, slug);

create index article_translations_search_idx
  on article_translations using gin (search_vector);
create index article_translations_title_trgm_idx
  on article_translations using gin (title gin_trgm_ops);
create index article_translations_content_trgm_idx
  on article_translations using gin (content_markdown gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Zoekvector per taal
-- ---------------------------------------------------------------------------

-- Bewust een trigger en geen `generated always`: de cast text->regconfig is
-- STABLE, niet IMMUTABLE, en mag daarom niet in een generated column. Een
-- case-expressie mét expliciete ::regconfig-literals zou wel mogen, maar dan
-- dwingt het toevoegen van Duits een DROP/ADD van de kolom af — en dus een
-- volledige herschrijving van de tabel. Met een trigger is dat één extra tak.
create or replace function zet_vertaling_zoekvector()
returns trigger
language plpgsql
as $$
declare
  cfg regconfig := case new.locale
    when 'nl' then 'dutch'::regconfig
    when 'en' then 'english'::regconfig
    when 'fr' then 'french'::regconfig
    else 'simple'::regconfig
  end;
begin
  new.search_vector :=
    setweight(to_tsvector(cfg, coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector(cfg, coalesce(new.summary, '')), 'B') ||
    setweight(to_tsvector(cfg, coalesce(new.content_markdown, '')), 'C');
  new.updated_at := now();
  return new;
end;
$$;

create trigger article_translations_zoekvector
  before insert or update on article_translations
  for each row execute function zet_vertaling_zoekvector();

-- ---------------------------------------------------------------------------
-- Spiegelen van articles naar de nl-rij
-- ---------------------------------------------------------------------------

-- security definer: de functie schrijft naar article_translations namens de
-- Zoho-import en de editor. De eigenaar van de tabel omzeilt RLS, zodat de
-- spiegeling niet stukloopt op het select-beleid hieronder.
create or replace function spiegel_artikel_naar_vertaling()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into article_translations
    (article_id, locale, slug, title, summary, content_markdown, review_state)
  values
    (new.id, 'nl', new.slug, new.title, new.summary, new.content_markdown, 'nagekeken')
  on conflict (article_id, locale) do update set
    slug             = excluded.slug,
    title            = excluded.title,
    summary          = excluded.summary,
    content_markdown = excluded.content_markdown;

  -- Inhoudelijk gewijzigd? Dan zijn de andere talen achterhaald. Een gewijzigde
  -- status of review-datum raakt de vertaling niet, dus die telt hier niet mee.
  if tg_op = 'UPDATE' and (
       new.title            is distinct from old.title
    or new.summary          is distinct from old.summary
    or new.content_markdown is distinct from old.content_markdown
  ) then
    update article_translations
       set stale = true
     where article_id = new.id
       and locale <> 'nl';
  end if;

  return new;
end;
$$;

create trigger articles_spiegel_vertaling
  after insert or update on articles
  for each row execute function spiegel_artikel_naar_vertaling();

-- ---------------------------------------------------------------------------
-- Revisies krijgen een taal
-- ---------------------------------------------------------------------------

alter table article_revisions
  add column locale article_locale not null default 'nl';

-- ---------------------------------------------------------------------------
-- Row Level Security — zelfde patroon als article_tags (0001) + 0007
-- ---------------------------------------------------------------------------

alter table article_translations enable row level security;

-- Zonder dit select-beleid geeft zoek_artikelen (security invoker) een
-- medewerker stilzwijgend een lege lijst terug.
create policy article_translations_select on article_translations
  for select using (
    is_active_user() and exists (
      select 1 from articles a
      where a.id = article_translations.article_id
        and (a.status = 'published' or is_editor_or_admin())
    )
  );

create policy article_translations_editor on article_translations
  for all using (is_editor_or_admin()) with check (is_editor_or_admin());

-- ---------------------------------------------------------------------------
-- Backfill: bestaande artikelen worden hun eigen nl-vertaling
-- ---------------------------------------------------------------------------

-- Idempotent, zodat opnieuw uitvoeren niets kapotmaakt.
insert into article_translations
  (article_id, locale, slug, title, summary, content_markdown, review_state)
select id, 'nl', slug, title, summary, content_markdown, 'nagekeken'
from articles
on conflict (article_id, locale) do nothing;
