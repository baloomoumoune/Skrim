-- Jalon 1.4 — Add 6 new valorant_* tables + sync_runs audit table.
-- All tables follow the existing valorant_* convention: text PK, raw_data jsonb,
-- created_at/updated_at with moddatetime trigger, RLS public read.
-- sync_runs is an audit log, RLS private (no SELECT policy for anon/authenticated).

-- ============================================================
-- 1. valorant_competitive_tiers (~10 rows)
-- ============================================================
CREATE TABLE valorant_competitive_tiers (
  uuid text PRIMARY KEY,
  asset_object_name text,
  tiers jsonb NOT NULL,
  asset_path text,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER valorant_competitive_tiers_set_updated_at
  BEFORE UPDATE ON valorant_competitive_tiers
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE valorant_competitive_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "valorant_competitive_tiers_read_all"
  ON valorant_competitive_tiers FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- 2. valorant_seasons_competitive (~50 rows) — depends on seasons + competitive_tiers
-- ============================================================
CREATE TABLE valorant_seasons_competitive (
  uuid text PRIMARY KEY,
  season_uuid text NOT NULL REFERENCES valorant_seasons(uuid),
  competitive_tiers_uuid text NOT NULL REFERENCES valorant_competitive_tiers(uuid),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  borders jsonb DEFAULT '[]'::jsonb,
  asset_path text,
  is_current boolean DEFAULT false,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX valorant_seasons_competitive_is_current_idx ON valorant_seasons_competitive(is_current);
CREATE INDEX valorant_seasons_competitive_season_uuid_idx ON valorant_seasons_competitive(season_uuid);

CREATE TRIGGER valorant_seasons_competitive_set_updated_at
  BEFORE UPDATE ON valorant_seasons_competitive
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE valorant_seasons_competitive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "valorant_seasons_competitive_read_all"
  ON valorant_seasons_competitive FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- 3. valorant_weapons (~17 rows)
-- ============================================================
CREATE TABLE valorant_weapons (
  uuid text PRIMARY KEY,
  display_name text NOT NULL,
  category text NOT NULL,
  default_skin_uuid text,
  display_icon text,
  kill_stream_icon text,
  asset_path text,
  weapon_stats jsonb,
  shop_data jsonb,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX valorant_weapons_category_idx ON valorant_weapons(category);

CREATE TRIGGER valorant_weapons_set_updated_at
  BEFORE UPDATE ON valorant_weapons
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE valorant_weapons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "valorant_weapons_read_all"
  ON valorant_weapons FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- 4. valorant_gear (~3 rows)
-- ============================================================
CREATE TABLE valorant_gear (
  uuid text PRIMARY KEY,
  display_name text NOT NULL,
  description text,
  display_icon text,
  asset_path text,
  shop_data jsonb,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER valorant_gear_set_updated_at
  BEFORE UPDATE ON valorant_gear
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE valorant_gear ENABLE ROW LEVEL SECURITY;

CREATE POLICY "valorant_gear_read_all"
  ON valorant_gear FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- 5. valorant_level_borders (~20 rows)
-- ============================================================
CREATE TABLE valorant_level_borders (
  uuid text PRIMARY KEY,
  display_name text,
  starting_level int NOT NULL,
  level_number_appearance text,
  small_player_card_appearance text,
  asset_path text,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX valorant_level_borders_starting_level_idx ON valorant_level_borders(starting_level);

CREATE TRIGGER valorant_level_borders_set_updated_at
  BEFORE UPDATE ON valorant_level_borders
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE valorant_level_borders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "valorant_level_borders_read_all"
  ON valorant_level_borders FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- 6. valorant_events (~30 rows)
-- ============================================================
CREATE TABLE valorant_events (
  uuid text PRIMARY KEY,
  display_name text NOT NULL,
  short_display_name text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  asset_path text,
  is_current boolean DEFAULT false,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX valorant_events_is_current_idx ON valorant_events(is_current);
CREATE INDEX valorant_events_start_time_idx ON valorant_events(start_time);

CREATE TRIGGER valorant_events_set_updated_at
  BEFORE UPDATE ON valorant_events
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE valorant_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "valorant_events_read_all"
  ON valorant_events FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- 7. sync_runs (audit log, private)
-- 1 INSERT per cron run. Tracks valorant API sync health.
-- RLS active without any SELECT policy = service_role only.
-- ============================================================
CREATE TABLE sync_runs (
  id bigserial PRIMARY KEY,
  ran_at timestamptz NOT NULL DEFAULT now(),
  duration_ms int NOT NULL,
  success boolean NOT NULL,
  valorant_version text,
  valorant_build_date timestamptz,
  endpoints_summary jsonb NOT NULL,
  errors text[] NOT NULL DEFAULT '{}'::text[],
  triggered_rank_reset boolean NOT NULL DEFAULT false,
  new_current_act_uuid text
);

CREATE INDEX sync_runs_ran_at_idx ON sync_runs(ran_at DESC);

ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;
-- intentionally NO policies = service_role only access via dashboard or RPC
