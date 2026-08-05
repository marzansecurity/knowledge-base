-- Escalatie-inbox: legt vast welke AI-antwoorden zijn geëscaleerd, zodat
-- Martijn ze kan afhandelen en er nieuwe kennisbank-artikelen uit kan halen.

alter table messages
  add column escalated       boolean     not null default false,
  add column origin_question text,
  add column resolved_at     timestamptz,
  add column resolved_by     uuid        references profiles (user_id) on delete set null,
  add column resolution_note text;

-- Snelle lijst van openstaande escalaties.
create index messages_escalated_open_idx
  on messages (created_at desc)
  where escalated and resolved_at is null;

-- Admins mogen escalaties van iedereen afhandelen (resolved_at/resolved_by/resolution_note
-- zetten), ook al staat conversations_own/messages_own qua eigenaarschap in de weg voor
-- de update-kant van die policy.
create policy messages_admin_resolve on messages
  for update using (is_admin()) with check (is_admin());
