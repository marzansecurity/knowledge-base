-- Vertaalde weergavenamen voor categorieën en tags.
--
-- Bewust alleen het LABEL. `categories.slug` en `tags.name` blijven taalneutraal:
-- de categorie-slug is de filterwaarde in de querystring van de bibliotheek en
-- de tagnaam is de sleutel waarop artikelIdsMetTags filtert (en waarop de
-- Zoho-import zijn tags opzoekt). Die vertalen zou elke opgeslagen filter-URL
-- en de import breken.
--
-- Ontbreekt een vertaling, dan valt de weergave terug op de Nederlandse naam.

create table category_translations (
  category_id uuid           not null references categories (id) on delete cascade,
  locale      article_locale not null,
  name        text           not null,
  primary key (category_id, locale)
);

create table tag_translations (
  tag_id uuid           not null references tags (id) on delete cascade,
  locale article_locale not null,
  name   text           not null,
  primary key (tag_id, locale)
);

-- ---------------------------------------------------------------------------
-- Row Level Security — iedereen leest, alleen beheerders wijzigen.
-- Categorieën en tags zijn ook in 0007 beheerderswerk gebleven.
-- ---------------------------------------------------------------------------

alter table category_translations enable row level security;
alter table tag_translations      enable row level security;

create policy category_translations_select on category_translations
  for select using (is_active_user());
create policy category_translations_admin on category_translations
  for all using (is_admin()) with check (is_admin());

create policy tag_translations_select on tag_translations
  for select using (is_active_user());
create policy tag_translations_admin on tag_translations
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Startvertalingen voor de categorieën uit 0001_init.sql
-- ---------------------------------------------------------------------------

insert into category_translations (category_id, locale, name)
select c.id, v.locale::article_locale, v.name
from categories c
join (values
  ('start-hier',               'en', 'Start here'),
  ('start-hier',               'fr', 'Commencer ici'),
  ('orderverwerking',          'en', 'Order processing'),
  ('orderverwerking',          'fr', 'Traitement des commandes'),
  ('verzending-magazijnen',    'en', 'Shipping & warehouses'),
  ('verzending-magazijnen',    'fr', 'Expédition et entrepôts'),
  ('installatie-services',     'en', 'Installation & services'),
  ('installatie-services',     'fr', 'Installation et services'),
  ('betalen-administratie',    'en', 'Payments & administration'),
  ('betalen-administratie',    'fr', 'Paiement et administration'),
  ('retour-klachten',          'en', 'Returns & complaints'),
  ('retour-klachten',          'fr', 'Retours et réclamations'),
  ('kluisproblemen',           'en', 'Safe problems'),
  ('kluisproblemen',           'fr', 'Problèmes de coffres-forts'),
  ('b2b-accounts',             'en', 'B2B accounts'),
  ('b2b-accounts',             'fr', 'Comptes B2B'),
  ('toeleveranciers-partners', 'en', 'Suppliers & partners'),
  ('toeleveranciers-partners', 'fr', 'Fournisseurs et partenaires')
) as v (slug, locale, name) on v.slug = c.slug
on conflict (category_id, locale) do nothing;

-- ---------------------------------------------------------------------------
-- Startvertalingen voor de tags uit 0001_init.sql
--
-- Merknamen (magento, pon, b2b, uk, dropshipment) blijven onvertaald; die
-- ontbreken hier bewust en vallen dus terug op de Nederlandse waarde.
-- ---------------------------------------------------------------------------

insert into tag_translations (tag_id, locale, name)
select t.id, v.locale::article_locale, v.name
from tags t
join (values
  ('installatie',         'en', 'installation'),
  ('installatie',         'fr', 'installation'),
  ('kredietcheck',        'en', 'credit check'),
  ('kredietcheck',        'fr', 'contrôle de crédit'),
  ('sleutels',            'en', 'keys'),
  ('sleutels',            'fr', 'clés'),
  ('nederland',           'en', 'netherlands'),
  ('nederland',           'fr', 'pays-bas'),
  ('belgie',              'en', 'belgium'),
  ('belgie',              'fr', 'belgique'),
  ('escalatie-verplicht', 'en', 'escalation required'),
  ('escalatie-verplicht', 'fr', 'escalade obligatoire')
) as v (naam, locale, name) on v.naam = t.name
on conflict (tag_id, locale) do nothing;
