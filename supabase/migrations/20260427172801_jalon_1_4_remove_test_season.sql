-- Remove Jalon 1.3 synthetic Test Season fixture.
-- Now that real Riot seasons are synced, the test fixture's time window keeps
-- re-flagging it as is_current alongside the real V26 season.
-- Safe: no acts or competitive seasons reference it (verified pre-migration).
DELETE FROM valorant_seasons WHERE uuid = '00000000-0000-0000-0000-000000000001';
