-- Jalon 1.4 — Add columns to existing valorant_* tables.
-- Backfill agent slugs immediately. episode_number / act_number / NOT NULL constraint
-- come in a follow-up migration after inspecting display_name patterns.

ALTER TABLE valorant_seasons ADD COLUMN episode_number int;
ALTER TABLE valorant_acts ADD COLUMN act_number int;
ALTER TABLE valorant_acts ADD COLUMN reset_processed boolean NOT NULL DEFAULT false;
ALTER TABLE valorant_agents ADD COLUMN slug text;

-- Backfill agent slugs (29 existing rows)
UPDATE valorant_agents
SET slug = lower(regexp_replace(display_name, '[^a-zA-Z0-9]', '', 'g'));
