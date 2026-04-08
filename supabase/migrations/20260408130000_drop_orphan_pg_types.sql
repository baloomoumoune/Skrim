-- Drop orphan enums and functions left behind after dropping
-- match_requests, scrims, and availabilities tables.
DROP TYPE IF EXISTS match_request_status CASCADE;
DROP TYPE IF EXISTS scrim_status CASCADE;
DROP FUNCTION IF EXISTS accept_match_request CASCADE;
