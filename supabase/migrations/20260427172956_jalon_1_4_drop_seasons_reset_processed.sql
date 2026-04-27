-- Move reset_processed from seasons to acts (acts column added in B2).
-- Live data confirmed all 14 seasons had reset_processed=false, so no
-- back-port needed. The new sync triggers rank reset on Act change, which
-- naturally covers Episode changes too (last act of E9 -> first act of E10).
ALTER TABLE valorant_seasons DROP COLUMN reset_processed;
