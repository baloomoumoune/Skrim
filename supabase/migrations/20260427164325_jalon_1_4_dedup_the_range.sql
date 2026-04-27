-- Jalon 1.4 — Dedup "The Range" duplicate maps.
-- valorant-api.com returns 2 entries with displayName "The Range":
--   ee613ee9-28b7-4beb-9666-08db13bb2244  (kept — canonical)
--   5914d1e0-40c4-cfdd-6b88-eba06347686c  (deleted)
-- Both rows in DB are functionally identical (same is_playable, same splash, no icon).
-- No matches reference either UUID (matches table has no map column at this jalon).
-- Riot still returns BOTH UUIDs from /v1/maps, so the new sync's upsertMaps must
-- skip the deleted UUID. See sync-valorant-data/helpers.ts → BLOCKED_MAP_UUIDS.

DELETE FROM valorant_maps
WHERE uuid = '5914d1e0-40c4-cfdd-6b88-eba06347686c';
