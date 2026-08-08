-- Auto-voorstel-functie: op basis van herhaalde, nog openstaande escalaties
-- stelt de AI een concept-artikel voor. De AI verzint hierbij nooit het
-- antwoord zelf (dat weet ze niet — daarom escaleerde het juist) — ze
-- herkent alleen het patroon en levert een scaffold die een redacteur moet
-- invullen. Zie src/lib/prompt.ts (VOORSTEL_SYSTEEMPROMPT) voor die regel.

create table article_proposals (
  id                  uuid primary key default gen_random_uuid(),
  title               text        not null,
  summary             text,
  content_markdown    text        not null,
  -- De escalatie-berichten (messages.id) die aanleiding gaven tot dit voorstel.
  source_message_ids  uuid[]      not null default '{}',
  status              text        not null default 'open'
                        check (status in ('open', 'aangemaakt', 'afgewezen')),
  resulting_article_id uuid       references articles (id) on delete set null,
  created_at          timestamptz not null default now(),
  created_by          uuid        references profiles (user_id) on delete set null,
  reviewed_at         timestamptz,
  reviewed_by         uuid        references profiles (user_id) on delete set null
);

create index article_proposals_status_idx on article_proposals (status, created_at desc);

alter table article_proposals enable row level security;

-- Alleen redacteuren en beheerders zien en beheren voorstellen — zelfde niveau als escalaties.
create policy article_proposals_editor on article_proposals
  for all using (is_editor_or_admin()) with check (is_editor_or_admin());
