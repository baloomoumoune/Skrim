-- The handle_new_user trigger inserted a stub profile with legacy region 'eu'
-- and missed required NOT NULL columns added by Find Lasts (birthdate, current_rank,
-- primary_language). The onboarding wizard now upserts the full profile row when
-- the user completes onboarding, so this trigger is obsolete.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
