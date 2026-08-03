-- Marzan Kennisbank — basisschema
-- Uitvoeren in de Supabase SQL Editor (project ffvwfzynpamvxopaphti, regio EU).

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type article_status as enum ('draft', 'published', 'outdated', 'archived');
create type article_source as enum ('handmatig', 'zoho-import');
create type user_role as enum ('reader', 'admin');

-- ---------------------------------------------------------------------------
-- Profielen
-- ---------------------------------------------------------------------------

create table profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text        not null,
  role         user_role   not null default 'reader',
  active       boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Security definer, zodat het RLS-beleid op profiles zichzelf niet aanroept.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where user_id = auth.uid() and role = 'admin' and active
  );
$$;

create or replace function is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where user_id = auth.uid() and active
  );
$$;

-- Nieuwe auth-gebruikers krijgen automatisch een profiel als reader.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Categorieën en tags
-- ---------------------------------------------------------------------------

create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text    not null,
  slug       text    not null unique,
  parent_id  uuid    references categories (id) on delete set null,
  sort_order integer not null default 0,
  active     boolean not null default true
);

create index categories_parent_idx on categories (parent_id);

create table tags (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

create index tags_name_trgm_idx on tags using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Artikelen
-- ---------------------------------------------------------------------------

create table articles (
  id               uuid           primary key default gen_random_uuid(),
  slug             text           not null unique,
  title            text           not null,
  summary          text,
  content_markdown text           not null default '',
  status           article_status not null default 'draft',
  category_id      uuid           references categories (id) on delete set null,
  owner_id         uuid           references profiles (user_id) on delete set null,
  source           article_source not null default 'handmatig',
  source_article_id text,
  source_checksum   text,
  published_at     timestamptz,
  reviewed_at      timestamptz,
  review_due_at    timestamptz,
  created_at       timestamptz    not null default now(),
  updated_at       timestamptz    not null default now(),
  created_by       uuid           references profiles (user_id) on delete set null,
  updated_by       uuid           references profiles (user_id) on delete set null,
  search_vector    tsvector generated always as (
    setweight(to_tsvector('dutch'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('dutch'::regconfig, coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('dutch'::regconfig, coalesce(content_markdown, '')), 'C')
  ) stored
);

-- Herhaalde Zoho-import mag geen duplicaten maken.
create unique index articles_source_article_id_idx
  on articles (source_article_id)
  where source_article_id is not null;

create index articles_status_idx        on articles (status);
create index articles_category_idx      on articles (category_id);
create index articles_search_idx        on articles using gin (search_vector);
create index articles_title_trgm_idx    on articles using gin (title gin_trgm_ops);
create index articles_content_trgm_idx  on articles using gin (content_markdown gin_trgm_ops);

create table article_tags (
  article_id uuid not null references articles (id) on delete cascade,
  tag_id     uuid not null references tags (id) on delete cascade,
  primary key (article_id, tag_id)
);

create index article_tags_tag_idx on article_tags (tag_id);

create table article_revisions (
  id               uuid        primary key default gen_random_uuid(),
  article_id       uuid        not null references articles (id) on delete cascade,
  title            text        not null,
  content_markdown text        not null,
  saved_at         timestamptz not null default now(),
  saved_by         uuid        references profiles (user_id) on delete set null,
  change_note      text
);

create index article_revisions_article_idx on article_revisions (article_id, saved_at desc);

-- ---------------------------------------------------------------------------
-- AI-gesprekken
-- ---------------------------------------------------------------------------

create table conversations (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles (user_id) on delete cascade,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_idx on conversations (user_id, updated_at desc);

create table messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references conversations (id) on delete cascade,
  role            text        not null check (role in ('user', 'assistant')),
  content         text        not null,
  -- Artikelen waarnaar dit antwoord verwijst, als array van article-id's.
  cited_article_ids uuid[]    not null default '{}',
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- updated_at bijhouden
-- ---------------------------------------------------------------------------

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch      before update on profiles      for each row execute function touch_updated_at();
create trigger articles_touch      before update on articles      for each row execute function touch_updated_at();
create trigger conversations_touch before update on conversations for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table profiles          enable row level security;
alter table categories        enable row level security;
alter table tags              enable row level security;
alter table articles          enable row level security;
alter table article_tags      enable row level security;
alter table article_revisions enable row level security;
alter table conversations     enable row level security;
alter table messages          enable row level security;

-- Profielen: iedereen leest, alleen admin wijzigt.
create policy profiles_select on profiles for select using (is_active_user());
create policy profiles_admin  on profiles for all    using (is_admin()) with check (is_admin());

-- Categorieën en tags: iedereen leest, alleen admin beheert.
create policy categories_select on categories for select using (is_active_user());
create policy categories_admin  on categories for all    using (is_admin()) with check (is_admin());

create policy tags_select on tags for select using (is_active_user());
create policy tags_admin  on tags for all    using (is_admin()) with check (is_admin());

-- Artikelen: readers zien alleen gepubliceerd, admins zien alles.
create policy articles_select_published on articles
  for select using (is_active_user() and (status = 'published' or is_admin()));
create policy articles_admin on articles
  for all using (is_admin()) with check (is_admin());

create policy article_tags_select on article_tags
  for select using (
    is_active_user() and exists (
      select 1 from articles a
      where a.id = article_tags.article_id
        and (a.status = 'published' or is_admin())
    )
  );
create policy article_tags_admin on article_tags
  for all using (is_admin()) with check (is_admin());

-- Revisies: alleen admin.
create policy article_revisions_admin on article_revisions
  for all using (is_admin()) with check (is_admin());

-- Gesprekken: iedereen ziet alleen zijn eigen; admin ziet alles.
create policy conversations_own on conversations
  for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid());

create policy messages_own on messages
  for all using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.user_id = auth.uid() or is_admin())
    )
  )
  with check (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Startcategorieën
-- ---------------------------------------------------------------------------

insert into categories (name, slug, sort_order) values
  ('Start hier',                'start-hier',                1),
  ('Orderverwerking',           'orderverwerking',           2),
  ('Verzending & Magazijnen',   'verzending-magazijnen',     3),
  ('Installatie & Services',    'installatie-services',      4),
  ('Betalen & Administratie',   'betalen-administratie',     5),
  ('Retour & Klachten',         'retour-klachten',           6),
  ('Kluisproblemen',            'kluisproblemen',            7),
  ('B2B Accounts',              'b2b-accounts',              8),
  ('Toeleveranciers & Partners','toeleveranciers-partners',  9);

insert into tags (name) values
  ('magento'), ('pon'), ('dropshipment'), ('installatie'), ('b2b'),
  ('kredietcheck'), ('sleutels'), ('nederland'), ('belgie'), ('uk'),
  ('escalatie-verplicht');
