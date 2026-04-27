-- The slug-to-uuid backup table holds raw user data; lock it down so only the
-- service role can read it. Drop the table once we're past the 30-day window.
ALTER TABLE profiles_backup_pre_uuid_migration ENABLE ROW LEVEL SECURITY;
