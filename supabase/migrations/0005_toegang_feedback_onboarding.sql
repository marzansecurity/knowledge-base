-- Drie uitbreidingen op de AI-assistent en de kennisbank:
-- 1) Rolgebaseerde scoping: welke topcategorieën een medewerker in de AI-context krijgt.
-- 2) Duim omhoog/omlaag op AI-antwoorden, als extra kwaliteitssignaal naast escalaties.
-- 3) Leesstatus per artikel, voor een onboarding-checklist per medewerker.

-- ---------------------------------------------------------------------------
-- 1) Kennis-toegang per medewerker
-- ---------------------------------------------------------------------------

-- Geen rijen voor een profiel = geen restrictie (ziet alles). Admins zijn altijd
-- onbeperkt, ongeacht wat hier staat — zie is_admin() in kennisbank.ts / toegang.ts.
create table profile_categories (
  profile_id  uuid not null references profiles (user_id) on delete cascade,
  category_id uuid not null references categories (id) on delete cascade,
  primary key (profile_id, category_id)
);

alter table profile_categories enable row level security;

create policy profile_categories_select on profile_categories
  for select using (profile_id = auth.uid() or is_admin());
create policy profile_categories_admin on profile_categories
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- 2) Feedback op AI-antwoorden
-- ---------------------------------------------------------------------------

alter table messages add column helpful boolean;

-- ---------------------------------------------------------------------------
-- 3) Onboarding: leesstatus per artikel per medewerker
-- ---------------------------------------------------------------------------

create table article_reads (
  profile_id uuid        not null references profiles (user_id) on delete cascade,
  article_id uuid        not null references articles (id) on delete cascade,
  read_at    timestamptz not null default now(),
  primary key (profile_id, article_id)
);

alter table article_reads enable row level security;

create policy article_reads_own on article_reads
  for all using (profile_id = auth.uid() or is_admin())
  with check (profile_id = auth.uid());
