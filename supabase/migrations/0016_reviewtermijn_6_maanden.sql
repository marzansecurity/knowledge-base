-- Reviewtermijn bevestigd (briefing open punt 5, 1 september 2026): 6 maanden
-- voor álle artikelen, in plaats van het voorstel 12/6. De app-kant staat in
-- beheer/artikelen/acties.ts (REVIEW_TERMIJN_MAANDEN).
--
-- Al toegepast via script; hier vastgelegd voor de historie.

update articles
set review_due_at = coalesce(reviewed_at, published_at, now()) + interval '6 months'
where status = 'published';
