-- Rechten voor de nieuwe "editor" (redacteur) rol.
-- Voer dit pas uit NA 0006_redacteur_rol.sql (zie toelichting daar).
--
-- Redacteuren mogen: artikelen aanmaken/bewerken/publiceren/archiveren, revisies
-- bekijken en herstellen, afbeeldingen uploaden, en escalaties afhandelen. Zij
-- beheren geen gebruikers, kennis-toegang of categorieën/tags — dat blijft
-- voorbehouden aan beheerders.

create or replace function is_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where user_id = auth.uid() and role in ('editor', 'admin') and active
  );
$$;

alter policy articles_admin on articles
  using (is_editor_or_admin()) with check (is_editor_or_admin());
alter policy articles_admin on articles rename to articles_editor;

alter policy article_tags_admin on article_tags
  using (is_editor_or_admin()) with check (is_editor_or_admin());
alter policy article_tags_admin on article_tags rename to article_tags_editor;

alter policy article_revisions_admin on article_revisions
  using (is_editor_or_admin()) with check (is_editor_or_admin());
alter policy article_revisions_admin on article_revisions rename to article_revisions_editor;

alter policy messages_admin_resolve on messages
  using (is_editor_or_admin()) with check (is_editor_or_admin());
alter policy messages_admin_resolve on messages rename to messages_editor_resolve;

-- messages_own dekt select al voor admins (is_admin() in de USING-clause), maar
-- niet voor editors — zonder deze policy ziet een redacteur in de escalatie-inbox
-- en feedbackpagina alleen zijn eigen gesprekken in plaats van die van iedereen.
create policy messages_editor_select on messages
  for select using (is_editor_or_admin());
