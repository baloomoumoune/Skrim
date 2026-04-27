-- Migrate profiles.main_agent values from slug to UUID + FK to valorant_agents.
-- Both columns are text, so no type change is needed (valorant_agents.uuid is
-- declared text, mirroring the existing baseline schema for all valorant_* tables).
-- Backup: kept for 30 days then dropped manually.
CREATE TABLE IF NOT EXISTS profiles_backup_pre_uuid_migration AS
  SELECT id, main_agent, now() AS backed_up_at
  FROM profiles
  WHERE main_agent IS NOT NULL;

-- Step 1: convert known slugs to their UUID.
UPDATE profiles p
SET main_agent = va.uuid
FROM valorant_agents va
WHERE va.slug = p.main_agent;

-- Step 2: NULL out unmatched values (e.g. test profile 'miks' has no agent).
UPDATE profiles SET main_agent = NULL
WHERE main_agent IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM valorant_agents va WHERE va.uuid = profiles.main_agent);

-- Step 3: add FK with ON DELETE SET NULL (don't cascade-delete profiles).
ALTER TABLE profiles
  ADD CONSTRAINT profiles_main_agent_fkey
  FOREIGN KEY (main_agent) REFERENCES valorant_agents(uuid) ON DELETE SET NULL;
