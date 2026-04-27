-- Rename process_rank_reset to operate on Acts (UUID) instead of Seasons.
-- Body identical to the original except the table reference and parameter names.
DROP FUNCTION IF EXISTS public.process_rank_reset(text, uuid[]);

CREATE OR REPLACE FUNCTION public.process_rank_reset(p_act_uuid text, p_target_user_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(affected_count integer, user_ids uuid[])
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_act_ready boolean;
  v_user_ids uuid[];
  v_count int;
BEGIN
  -- Lock explicite sur la ligne de l'Act
  -- Le SELECT ... FOR UPDATE pose le lock même si la condition est false
  -- Cela distingue "Act inexistant" de "Act déjà traité"
  SELECT reset_processed = false INTO v_act_ready
  FROM valorant_acts
  WHERE uuid = p_act_uuid
  FOR UPDATE;

  IF v_act_ready IS NULL THEN
    RAISE EXCEPTION 'Act % not found', p_act_uuid;
  END IF;

  IF v_act_ready = false THEN
    RAISE EXCEPTION 'Act % already processed', p_act_uuid;
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

  -- Marquer l'Act comme traité
  UPDATE valorant_acts
  SET reset_processed = true
  WHERE uuid = p_act_uuid;

  RETURN QUERY SELECT v_count, v_user_ids;
END;
$function$;
