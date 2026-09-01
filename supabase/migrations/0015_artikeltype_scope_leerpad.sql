-- Briefing kennisbank v0.2 (1 september 2026), besluiten A1, A3, A4, B1, C3 en A5.
--
-- A1  Artikeltype als enum-veld — het type bepaalt het sjabloon. Vervangt de tag
--     "gespreksroute", die hieronder ook wordt opgeruimd.
-- A4  "Geldig voor" wordt data: countries (leeg = geldt overal) en channel.
--     Zelfde landwaarden als suppliers.countries (NL/BE/UK).
-- B1  Leerpad: path_order (plek in het onboarding-pad) en required_reading.
-- A3  Elfde categorie: Systemen & Applicaties.
-- C3  Escalatie-frequentie: per open escalatie tellen hoeveel vergelijkbare
--     open vragen er zijn, zodat de inbox op aantal kan sorteren.
-- A5  review_due_at krijgt een backfill voor al gepubliceerde artikelen; het
--     zetten bij publicatie gebeurt voortaan in de app (wijzigStatus).

create type article_type as enum ('gespreksroute', 'procedure', 'naslag', 'producttraining');
create type article_channel as enum ('klantcontact', 'backoffice', 'technisch', 'alle');

alter table articles
  add column type             article_type    not null default 'naslag',
  add column countries        text[]          not null default '{}',
  add column channel          article_channel not null default 'alle',
  add column path_order       integer,
  add column required_reading boolean         not null default false;

comment on column articles.countries        is 'NL/BE/UK, zelfde waarden als suppliers.countries. Leeg = geldt overal.';
comment on column articles.path_order       is 'Plek in het onboarding-leerpad. Null = staat niet in het pad, alleen doorzoekbaar.';
comment on column articles.required_reading is 'Moet gelezen zijn voordat de onboarding is afgerond.';

create index articles_type_idx      on articles (type);
create index articles_countries_idx on articles using gin (countries);

-- De bestaande gespreksroutes waren te herkennen aan hun tag. Overzetten naar
-- het veld, met de scope die tot nu toe alleen als prozaregel in de tekst stond.
update articles set type = 'gespreksroute', countries = '{NL}', channel = 'klantcontact'
where id in (
  select at.article_id
  from article_tags at
  join tags t on t.id = at.tag_id
  where t.name = 'gespreksroute'
);

-- De tag vervalt zodra het veld er is (briefing A1).
delete from article_tags where tag_id in (select id from tags where name = 'gespreksroute');
delete from tag_translations where tag_id in (select id from tags where name = 'gespreksroute');
delete from tags where name = 'gespreksroute';

-- A3: systemen en applicaties (Magento, Zoho Desk, werkbon-app, dashboards)
-- hadden geen thuis in de functionele boom.
insert into categories (name, slug, sort_order) values
  ('Systemen & Applicaties', 'systemen-applicaties', 11)
on conflict (slug) do nothing;

-- A5: reviewdatum voor artikelen die al gepubliceerd waren vóór deze migratie.
-- 12 maanden standaard, 6 voor alles met de tag "magento" (verandert het vaakst).
-- Nog te bevestigen termijnen — zie ook REVIEW_TERMIJN in beheer/artikelen/acties.ts.
update articles
set review_due_at = coalesce(published_at, now()) + interval '12 months'
where status = 'published' and review_due_at is null;

update articles
set review_due_at = coalesce(published_at, now()) + interval '6 months'
where status = 'published'
  and id in (
    select at.article_id
    from article_tags at
    join tags t on t.id = at.tag_id
    where t.name = 'magento'
  );

-- C3: per open escalatie het aantal open escalaties met een vergelijkbare vraag
-- (inclusief zichzelf, dus minimaal 1). Vergelijkbaar = pg_trgm-similariteit
-- boven 0.4 — ruim genoeg om herformuleringen te vangen, streng genoeg om niet
-- alles op één hoop te gooien. Geen security definer: de RLS op messages
-- (messages_editor_select) bepaalt wie dit mag zien.
create or replace function escalatie_frequenties()
returns table (message_id uuid, aantal integer)
language sql
stable
set search_path = public
as $$
  select m1.id, count(*)::int
  from messages m1
  join messages m2
    on m2.escalated
   and m2.resolved_at is null
   and similarity(coalesce(m1.origin_question, ''), coalesce(m2.origin_question, '')) > 0.4
  where m1.escalated and m1.resolved_at is null
  group by m1.id;
$$;
