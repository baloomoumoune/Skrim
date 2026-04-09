


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."game_type" AS ENUM (
    'valorant',
    'cs2'
);


ALTER TYPE "public"."game_type" OWNER TO "postgres";


CREATE TYPE "public"."match_status" AS ENUM (
    'open',
    'full',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."match_status" OWNER TO "postgres";


CREATE TYPE "public"."region_type" AS ENUM (
    'eu',
    'na',
    'apac',
    'sa',
    'me',
    'oce'
);


ALTER TYPE "public"."region_type" OWNER TO "postgres";


CREATE TYPE "public"."team_invite_status" AS ENUM (
    'pending',
    'accepted',
    'rejected'
);


ALTER TYPE "public"."team_invite_status" OWNER TO "postgres";


CREATE TYPE "public"."team_role" AS ENUM (
    'captain',
    'player',
    'sub',
    'coach',
    'president'
);


ALTER TYPE "public"."team_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_team_invite"("p_invite_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_invite team_invites%ROWTYPE;
  v_team teams%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM team_invites WHERE id = p_invite_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Invite not found or already processed'; END IF;
  IF v_invite.invited_user_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO v_team FROM teams WHERE id = v_invite.team_id;

  DELETE FROM team_members
  WHERE user_id = v_invite.invited_user_id
    AND team_id IN (SELECT id FROM teams WHERE game = v_team.game);

  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_invite.team_id, v_invite.invited_user_id, 'player');

  UPDATE team_invites SET status = 'accepted', updated_at = now() WHERE id = p_invite_id;

  UPDATE team_invites SET status = 'rejected', updated_at = now()
  WHERE invited_user_id = v_invite.invited_user_id
    AND status = 'pending'
    AND id != p_invite_id
    AND team_id IN (SELECT id FROM teams WHERE game = v_team.game);
END;
$$;


ALTER FUNCTION "public"."accept_team_invite"("p_invite_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_active_match"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS(
    SELECT 1 FROM match_members mm
    JOIN matches m ON mm.match_id = m.id
    WHERE mm.user_id = p_user_id
      AND mm.kicked_at IS NULL
      AND m.status IN ('open', 'full', 'in_progress')
  );
$$;


ALTER FUNCTION "public"."check_active_match"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_email_exists"("p_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE email = lower(p_email));
$$;


ALTER FUNCTION "public"."check_email_exists"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_kick_cooldown"("p_user_id" "uuid", "p_match_id" "uuid", "p_cooldown_minutes" integer DEFAULT 30) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS(
    SELECT 1 FROM match_members
    WHERE user_id = p_user_id
      AND match_id = p_match_id
      AND kicked_at IS NOT NULL
      AND kicked_at > now() - (p_cooldown_minutes || ' minutes')::interval
  );
$$;


ALTER FUNCTION "public"."check_kick_cooldown"("p_user_id" "uuid", "p_match_id" "uuid", "p_cooldown_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_single_active_match"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM match_members mm
    JOIN matches m ON mm.match_id = m.id
    WHERE mm.user_id = NEW.user_id
    AND mm.kicked_at IS NULL
    AND m.status IN ('open', 'full', 'in_progress')
    AND mm.match_id != NEW.match_id
  ) THEN
    RAISE EXCEPTION 'User already has an active match';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_single_active_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_username_available"("p_username" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE LOWER(username) = LOWER(p_username)
    AND NOT username LIKE 'pending_%'
  );
END;
$$;


ALTER FUNCTION "public"."check_username_available"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_old_matches"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Open/full matches: expire when expires_at has passed
  UPDATE matches
  SET status = 'cancelled'
  WHERE status IN ('open', 'full')
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  -- Fallback for matches without expires_at (legacy): expire 1h after creation
  UPDATE matches
  SET status = 'cancelled'
  WHERE status IN ('open', 'full')
    AND expires_at IS NULL
    AND created_at < NOW() - INTERVAL '1 hour';

  -- In-progress matches: auto-complete after 60min from launch
  UPDATE matches
  SET status = 'completed'
  WHERE status = 'in_progress'
    AND launched_at IS NOT NULL
    AND launched_at < NOW() - INTERVAL '60 minutes';

  -- Fallback for in_progress without launched_at: 60min from updated_at
  UPDATE matches
  SET status = 'completed'
  WHERE status = 'in_progress'
    AND launched_at IS NULL
    AND updated_at < NOW() - INTERVAL '60 minutes';
END;
$$;


ALTER FUNCTION "public"."expire_old_matches"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_team"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.president_id, 'president');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_team"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, discord_tag, region, timezone, preferred_game)
  VALUES (
    NEW.id,
    'pending_' || LEFT(NEW.id::text, 8),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'full_name',
    'eu',
    'Europe/Paris',
    'valorant'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_current_players"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_match_id UUID;
  v_count INT;
  v_max INT;
BEGIN
  -- Get the relevant match_id
  v_match_id := COALESCE(NEW.match_id, OLD.match_id);
  
  -- Count active (non-kicked) members
  SELECT COUNT(*) INTO v_count
  FROM match_members
  WHERE match_id = v_match_id AND kicked_at IS NULL;
  
  -- Get max_players
  SELECT max_players INTO v_max FROM matches WHERE id = v_match_id;
  
  -- Update current_players and auto-set status if full
  UPDATE matches SET 
    current_players = v_count,
    status = CASE 
      WHEN v_count >= v_max AND status IN ('open', 'full') THEN 'full'
      WHEN v_count < v_max AND status = 'full' THEN 'open'
      ELSE status  -- Don't change in_progress, completed, cancelled
    END
  WHERE id = v_match_id;
  
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."recalculate_current_players"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_team_rank"("p_team_id" "uuid", "p_rank_order" "text"[]) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  avg_idx INTEGER;
  result TEXT;
BEGIN
  SELECT ROUND(AVG(array_position(p_rank_order, p.current_rank)))::INTEGER
  INTO avg_idx
  FROM team_members tm
  JOIN profiles p ON p.id = tm.user_id
  WHERE tm.team_id = p_team_id
    AND p.current_rank IS NOT NULL
    AND array_position(p_rank_order, p.current_rank) IS NOT NULL;

  IF avg_idx IS NULL OR avg_idx < 1 THEN result := NULL;
  ELSE result := p_rank_order[avg_idx];
  END IF;

  UPDATE teams SET rank_tier = result WHERE id = p_team_id;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."recalculate_team_rank"("p_team_id" "uuid", "p_rank_order" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."renew_match"("p_match_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Verify caller is the match creator and match is still open/full
  IF NOT EXISTS (
    SELECT 1 FROM matches 
    WHERE id = p_match_id 
      AND creator_id = auth.uid()
      AND status IN ('open', 'full')
  ) THEN
    RAISE EXCEPTION 'Only the match creator can renew an open/full match';
  END IF;

  -- Extend expires_at by 10 minutes from now
  UPDATE matches 
  SET expires_at = NOW() + INTERVAL '10 minutes'
  WHERE id = p_match_id;
END;
$$;


ALTER FUNCTION "public"."renew_match"("p_match_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."match_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_ready" boolean DEFAULT false NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "kicked_at" timestamp with time zone
);


ALTER TABLE "public"."match_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game" "public"."game_type" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "region" "public"."region_type" NOT NULL,
    "rank_min" "text" NOT NULL,
    "rank_max" "text" NOT NULL,
    "rr_penalty" boolean DEFAULT false NOT NULL,
    "current_players" smallint DEFAULT 1 NOT NULL,
    "max_players" smallint DEFAULT 5 NOT NULL,
    "status" "public"."match_status" DEFAULT 'open'::"public"."match_status" NOT NULL,
    "discord_link" "text",
    "notes" "text",
    "platform" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scheduled_at" timestamp with time zone,
    "game_mode" "text" DEFAULT 'competitive'::"text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:10:00'::interval),
    "launched_at" timestamp with time zone,
    "group_code" "text",
    CONSTRAINT "matches_group_code_format" CHECK ((("group_code" IS NULL) OR (("char_length"("group_code") = 6) AND ("group_code" ~ '^[A-Z0-9]{6}$'::"text"))))
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "avatar_url" "text",
    "discord_tag" "text",
    "region" "public"."region_type" DEFAULT 'eu'::"public"."region_type" NOT NULL,
    "timezone" "text" DEFAULT 'Europe/Paris'::"text" NOT NULL,
    "preferred_game" "public"."game_type" DEFAULT 'valorant'::"public"."game_type",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "current_rank" "text",
    "main_agent" "text",
    "platform" "text",
    "push_token" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Player profiles extending Supabase auth';



CREATE TABLE IF NOT EXISTS "public"."team_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "invited_user_id" "uuid" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "status" "public"."team_invite_status" DEFAULT 'pending'::"public"."team_invite_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."team_role" DEFAULT 'player'::"public"."team_role" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "slot_index" integer,
    "is_captain" boolean DEFAULT false
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_members" IS 'Team roster with roles';



CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "tag" "text" NOT NULL,
    "logo_url" "text",
    "game" "public"."game_type" NOT NULL,
    "region" "public"."region_type" NOT NULL,
    "rank_tier" "text",
    "description" "text",
    "president_id" "uuid" NOT NULL,
    "invite_code" "text" DEFAULT "upper"("substr"("replace"(("gen_random_uuid"())::"text", '-'::"text", ''::"text"), 1, 8)),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "teams_tag_check" CHECK ((("char_length"("tag") >= 2) AND ("char_length"("tag") <= 5)))
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


COMMENT ON TABLE "public"."teams" IS 'Competitive teams with roster management';



CREATE TABLE IF NOT EXISTS "public"."valorant_acts" (
    "uuid" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "season_uuid" "text" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "is_current" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."valorant_acts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."valorant_agents" (
    "uuid" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "developer_name" "text",
    "role_uuid" "text" NOT NULL,
    "role_name" "text" NOT NULL,
    "role_display_icon" "text",
    "display_icon" "text",
    "full_portrait" "text",
    "killfeed_portrait" "text",
    "background" "text",
    "abilities" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_base_content" boolean DEFAULT false,
    "raw_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."valorant_agents" OWNER TO "postgres";


COMMENT ON COLUMN "public"."valorant_agents"."is_base_content" IS 'Agent included in base game content (free) vs agent to unlock via contract or purchase.';



CREATE TABLE IF NOT EXISTS "public"."valorant_game_modes" (
    "uuid" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "duration" "text",
    "display_icon" "text",
    "allows_match_timeouts" boolean DEFAULT false,
    "is_team_voice_allowed" boolean DEFAULT true,
    "raw_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."valorant_game_modes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."valorant_maps" (
    "uuid" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "tactical_description" "text",
    "coordinates" "text",
    "display_icon" "text",
    "list_view_icon" "text",
    "splash" "text",
    "is_playable" boolean GENERATED ALWAYS AS (("coordinates" IS NOT NULL)) STORED,
    "is_in_current_pool" boolean DEFAULT false,
    "raw_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."valorant_maps" OWNER TO "postgres";


COMMENT ON COLUMN "public"."valorant_maps"."is_in_current_pool" IS 'Map currently in competitive rotation. Managed manually via SQL, not synced automatically because valorant-api.com does not provide this information.';



CREATE TABLE IF NOT EXISTS "public"."valorant_seasons" (
    "uuid" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "is_current" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."valorant_seasons" OWNER TO "postgres";


ALTER TABLE ONLY "public"."match_members"
    ADD CONSTRAINT "match_members_match_id_user_id_key" UNIQUE ("match_id", "user_id");



ALTER TABLE ONLY "public"."match_members"
    ADD CONSTRAINT "match_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."valorant_acts"
    ADD CONSTRAINT "valorant_acts_pkey" PRIMARY KEY ("uuid");



ALTER TABLE ONLY "public"."valorant_agents"
    ADD CONSTRAINT "valorant_agents_pkey" PRIMARY KEY ("uuid");



ALTER TABLE ONLY "public"."valorant_game_modes"
    ADD CONSTRAINT "valorant_game_modes_pkey" PRIMARY KEY ("uuid");



ALTER TABLE ONLY "public"."valorant_maps"
    ADD CONSTRAINT "valorant_maps_pkey" PRIMARY KEY ("uuid");



ALTER TABLE ONLY "public"."valorant_seasons"
    ADD CONSTRAINT "valorant_seasons_pkey" PRIMARY KEY ("uuid");



CREATE INDEX "idx_match_members_user_active" ON "public"."match_members" USING "btree" ("user_id") WHERE ("kicked_at" IS NULL);



CREATE INDEX "idx_matches_creator" ON "public"."matches" USING "btree" ("creator_id");



CREATE INDEX "idx_matches_feed" ON "public"."matches" USING "btree" ("game", "region", "status");



CREATE INDEX "idx_profiles_region" ON "public"."profiles" USING "btree" ("region");



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "idx_team_invites_team" ON "public"."team_invites" USING "btree" ("team_id", "status");



CREATE UNIQUE INDEX "idx_team_invites_unique_pending" ON "public"."team_invites" USING "btree" ("team_id", "invited_user_id") WHERE ("status" = 'pending'::"public"."team_invite_status");



CREATE INDEX "idx_team_invites_user" ON "public"."team_invites" USING "btree" ("invited_user_id", "status");



CREATE INDEX "idx_team_members_team" ON "public"."team_members" USING "btree" ("team_id");



CREATE INDEX "idx_team_members_user" ON "public"."team_members" USING "btree" ("user_id");



CREATE INDEX "idx_teams_captain" ON "public"."teams" USING "btree" ("president_id");



CREATE INDEX "idx_teams_game" ON "public"."teams" USING "btree" ("game");



CREATE INDEX "idx_teams_game_region" ON "public"."teams" USING "btree" ("game", "region");



CREATE INDEX "idx_teams_invite_code" ON "public"."teams" USING "btree" ("invite_code");



CREATE INDEX "idx_teams_region" ON "public"."teams" USING "btree" ("region");



CREATE INDEX "idx_valorant_acts_is_current" ON "public"."valorant_acts" USING "btree" ("is_current");



CREATE INDEX "idx_valorant_acts_season_uuid" ON "public"."valorant_acts" USING "btree" ("season_uuid");



CREATE INDEX "idx_valorant_agents_role_name" ON "public"."valorant_agents" USING "btree" ("role_name");



CREATE INDEX "idx_valorant_maps_current_pool" ON "public"."valorant_maps" USING "btree" ("is_in_current_pool");



CREATE INDEX "idx_valorant_maps_is_playable" ON "public"."valorant_maps" USING "btree" ("is_playable");



CREATE INDEX "idx_valorant_seasons_is_current" ON "public"."valorant_seasons" USING "btree" ("is_current");



CREATE OR REPLACE TRIGGER "on_matches_updated" BEFORE UPDATE ON "public"."matches" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_profiles_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_team_created" AFTER INSERT ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_team"();



CREATE OR REPLACE TRIGGER "on_teams_updated" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_team_invites_updated_at" BEFORE UPDATE ON "public"."team_invites" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "trg_check_single_active_match" BEFORE INSERT ON "public"."match_members" FOR EACH ROW EXECUTE FUNCTION "public"."check_single_active_match"();



CREATE OR REPLACE TRIGGER "trg_recalculate_players" AFTER INSERT OR DELETE OR UPDATE OF "kicked_at" ON "public"."match_members" FOR EACH ROW EXECUTE FUNCTION "public"."recalculate_current_players"();



CREATE OR REPLACE TRIGGER "trg_valorant_acts_updated_at" BEFORE UPDATE ON "public"."valorant_acts" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "trg_valorant_agents_updated_at" BEFORE UPDATE ON "public"."valorant_agents" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "trg_valorant_game_modes_updated_at" BEFORE UPDATE ON "public"."valorant_game_modes" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "trg_valorant_maps_updated_at" BEFORE UPDATE ON "public"."valorant_maps" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "trg_valorant_seasons_updated_at" BEFORE UPDATE ON "public"."valorant_seasons" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



ALTER TABLE ONLY "public"."match_members"
    ADD CONSTRAINT "match_members_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_members"
    ADD CONSTRAINT "match_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_captain_id_fkey" FOREIGN KEY ("president_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."valorant_acts"
    ADD CONSTRAINT "valorant_acts_season_uuid_fkey" FOREIGN KEY ("season_uuid") REFERENCES "public"."valorant_seasons"("uuid");



CREATE POLICY "Allow public read on valorant_acts" ON "public"."valorant_acts" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read on valorant_agents" ON "public"."valorant_agents" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read on valorant_game_modes" ON "public"."valorant_game_modes" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read on valorant_maps" ON "public"."valorant_maps" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read on valorant_seasons" ON "public"."valorant_seasons" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Anyone can view match members" ON "public"."match_members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone can view matches" ON "public"."matches" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can create matches" ON "public"."matches" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "creator_id"));



CREATE POLICY "Authenticated users can create teams" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "president_id"));



CREATE POLICY "Can join match" ON "public"."match_members" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Can update own ready status" ON "public"."match_members" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Captain can add members" ON "public"."team_members" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_members"."team_id") AND ("teams"."president_id" = "auth"."uid"())))) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Captain can delete their team" ON "public"."teams" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "president_id"));



CREATE POLICY "Captain can remove members or members can leave" ON "public"."team_members" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_members"."team_id") AND ("teams"."president_id" = "auth"."uid"()))))));



CREATE POLICY "Captain can update member roles" ON "public"."team_members" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_members"."team_id") AND ("teams"."president_id" = "auth"."uid"())))));



CREATE POLICY "Captain can update their team" ON "public"."teams" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "president_id")) WITH CHECK (("auth"."uid"() = "president_id"));



CREATE POLICY "Captains can delete invites they sent" ON "public"."team_invites" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "invited_by"));



CREATE POLICY "Creator can update own match" ON "public"."matches" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "creator_id"));



CREATE POLICY "Invited users can update their invites" ON "public"."team_invites" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "invited_user_id"));



CREATE POLICY "Match creator can kick members" ON "public"."match_members" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."matches"
  WHERE (("matches"."id" = "match_members"."match_id") AND ("matches"."creator_id" = "auth"."uid"())))));



CREATE POLICY "Presidents can create invites" ON "public"."team_invites" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "invited_by") AND (EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_invites"."team_id") AND ("teams"."president_id" = "auth"."uid"()))))));



CREATE POLICY "Profiles are viewable by authenticated users" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Team members are viewable by authenticated users" ON "public"."team_members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Teams are viewable by authenticated users" ON "public"."teams" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view invites they sent or received" ON "public"."team_invites" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "invited_user_id") OR ("auth"."uid"() = "invited_by")));



ALTER TABLE "public"."match_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."valorant_acts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."valorant_agents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."valorant_game_modes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."valorant_maps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."valorant_seasons" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_team_invite"("p_invite_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_team_invite"("p_invite_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_team_invite"("p_invite_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_active_match"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_active_match"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_active_match"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_email_exists"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_email_exists"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_email_exists"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_kick_cooldown"("p_user_id" "uuid", "p_match_id" "uuid", "p_cooldown_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_kick_cooldown"("p_user_id" "uuid", "p_match_id" "uuid", "p_cooldown_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_kick_cooldown"("p_user_id" "uuid", "p_match_id" "uuid", "p_cooldown_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_single_active_match"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_single_active_match"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_single_active_match"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_username_available"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_username_available"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_username_available"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_old_matches"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_matches"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_matches"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_team"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_team"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_team"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_current_players"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_current_players"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_current_players"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_team_rank"("p_team_id" "uuid", "p_rank_order" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_team_rank"("p_team_id" "uuid", "p_rank_order" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_team_rank"("p_team_id" "uuid", "p_rank_order" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."renew_match"("p_match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."renew_match"("p_match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."renew_match"("p_match_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."match_members" TO "anon";
GRANT ALL ON TABLE "public"."match_members" TO "authenticated";
GRANT ALL ON TABLE "public"."match_members" TO "service_role";



GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."team_invites" TO "anon";
GRANT ALL ON TABLE "public"."team_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."team_invites" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."valorant_acts" TO "anon";
GRANT ALL ON TABLE "public"."valorant_acts" TO "authenticated";
GRANT ALL ON TABLE "public"."valorant_acts" TO "service_role";



GRANT ALL ON TABLE "public"."valorant_agents" TO "anon";
GRANT ALL ON TABLE "public"."valorant_agents" TO "authenticated";
GRANT ALL ON TABLE "public"."valorant_agents" TO "service_role";



GRANT ALL ON TABLE "public"."valorant_game_modes" TO "anon";
GRANT ALL ON TABLE "public"."valorant_game_modes" TO "authenticated";
GRANT ALL ON TABLE "public"."valorant_game_modes" TO "service_role";



GRANT ALL ON TABLE "public"."valorant_maps" TO "anon";
GRANT ALL ON TABLE "public"."valorant_maps" TO "authenticated";
GRANT ALL ON TABLE "public"."valorant_maps" TO "service_role";



GRANT ALL ON TABLE "public"."valorant_seasons" TO "anon";
GRANT ALL ON TABLE "public"."valorant_seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."valorant_seasons" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







