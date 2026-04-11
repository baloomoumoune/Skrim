-- ============================================================
-- Jalon 1.3 — Rank Reset Management
-- Adds rank reset tracking to profiles and valorant_seasons,
-- and creates the transactional process_rank_reset function.
-- ============================================================

-- 1. profiles: rank reset history columns
ALTER TABLE profiles
  ADD COLUMN previous_rank_before_reset text DEFAULT NULL,
  ADD COLUMN last_rank_reset_at timestamptz DEFAULT NULL;

-- 2. valorant_seasons: idempotency flag for rank resets
ALTER TABLE valorant_seasons
  ADD COLUMN reset_processed boolean NOT NULL DEFAULT false;

-- 3. Transactional function for atomic rank reset
CREATE OR REPLACE FUNCTION process_rank_reset(
  p_season_uuid text,
  p_target_user_ids uuid[] DEFAULT NULL
)
RETURNS TABLE(affected_count int, user_ids uuid[])
LANGUAGE plpgsql AS $$
DECLARE
  v_season_ready boolean;
  v_user_ids uuid[];
  v_count int;
BEGIN
  -- Lock explicite sur la ligne de la Season
  -- Le SELECT ... FOR UPDATE pose le lock même si la condition est false
  -- Cela distingue "Season inexistante" de "Season déjà traitée"
  SELECT reset_processed = false INTO v_season_ready
  FROM valorant_seasons
  WHERE uuid = p_season_uuid
  FOR UPDATE;

  IF v_season_ready IS NULL THEN
    RAISE EXCEPTION 'Season % not found', p_season_uuid;
  END IF;

  IF v_season_ready = false THEN
    RAISE EXCEPTION 'Season % already processed', p_season_uuid;
  END IF;

  -- Update profiles : sauvegarder le rank et reset
  -- Si p_target_user_ids est fourni, scope limité (mode test)
  -- Si NULL, tous les profils rankés (mode production)
  WITH updated AS (
    UPDATE profiles
    SET previous_rank_before_reset = current_rank,
        current_rank = 'unranked',
        last_rank_reset_at = now()
    WHERE current_rank IS NOT NULL
      AND current_rank != 'unranked'
      AND (p_target_user_ids IS NULL OR id = ANY(p_target_user_ids))
    RETURNING id
  )
  SELECT array_agg(id), count(*)::int INTO v_user_ids, v_count FROM updated;

  -- Marquer la Season comme traitée
  UPDATE valorant_seasons
  SET reset_processed = true
  WHERE uuid = p_season_uuid;

  RETURN QUERY SELECT v_count, v_user_ids;
END;
$$;
