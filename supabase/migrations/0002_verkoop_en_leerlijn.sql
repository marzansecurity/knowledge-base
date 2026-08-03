-- Tiende categorie voor pre-sales productvragen, en de tag voor de leerlijn.
-- Al toegepast via scripts/seed-extra.mjs; hier vastgelegd voor de historie.

insert into categories (name, slug, sort_order) values
  ('Verkoop & Productadvies', 'verkoop-productadvies', 10)
on conflict (slug) do nothing;

insert into tags (name) values ('start-hier')
on conflict (name) do nothing;
