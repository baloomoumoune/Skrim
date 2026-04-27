-- Jalon 1.4 — Backfill episode_number / act_number, then enforce NOT NULL + UNIQUE.
-- Patterns observed in prod:
--   seasons: "EPISODE N" (N=1..9), "V25", "V26", "Test Season (Jalon 1.3)" (NULL OK)
--   acts: 100% roman numerals "ACT I" to "ACT VI"
-- agent slugs already backfilled in 20260427164323; verified 0 collisions.

UPDATE valorant_seasons SET episode_number =
  CASE
    WHEN display_name ~ '^EPISODE ([0-9]+)$' THEN (regexp_match(display_name, '^EPISODE ([0-9]+)$'))[1]::int
    WHEN display_name ~ '^V([0-9]+)$' THEN (regexp_match(display_name, '^V([0-9]+)$'))[1]::int
    ELSE NULL
  END;

UPDATE valorant_acts SET act_number =
  CASE display_name
    WHEN 'ACT I'   THEN 1
    WHEN 'ACT II'  THEN 2
    WHEN 'ACT III' THEN 3
    WHEN 'ACT IV'  THEN 4
    WHEN 'ACT V'   THEN 5
    WHEN 'ACT VI'  THEN 6
    ELSE NULL
  END;

-- Enforce constraints. acts: all rows must have a number (39/39 covered above).
ALTER TABLE valorant_acts ALTER COLUMN act_number SET NOT NULL;

-- Agents: enforce slug NOT NULL + UNIQUE
ALTER TABLE valorant_agents ALTER COLUMN slug SET NOT NULL;
ALTER TABLE valorant_agents ADD CONSTRAINT valorant_agents_slug_unique UNIQUE (slug);
