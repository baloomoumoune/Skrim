-- Drop orphan tables (join requests abandoned, scrims/availabilities not yet built)
DROP TABLE IF EXISTS match_requests CASCADE;
DROP TABLE IF EXISTS scrims CASCADE;
DROP TABLE IF EXISTS availabilities CASCADE;
