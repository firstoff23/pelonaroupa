-- ============================================================================
-- Migration: 20260930000000_remediate_database_linter_warnings.sql
-- Description: Remediate 40 Supabase Database Linter (Splinter) Security Warnings
-- Categories:
--   1. Function Search Path Mutable (lint 0011)
--   2. Permissive RLS Policies with true (lint 0024)
--   3. Public Storage Bucket Allows Listing (lint 0025)
--   4. GraphQL Schema Exposure to Anon / Authenticated (lint 0026 & 0027)
--   5. Executable SECURITY DEFINER Functions (lint 0028 & 0029)
--   6. RLS Enabled But No Policies Exist (lint 0008)
-- ============================================================================

BEGIN;

-- ─── 1. Fix Mutable search_path on Functions (lint 0011) ──────────────────────
-- Prevents search_path hijacking attacks by pinning search_path explicitly

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'check_age_gate') THEN
    ALTER FUNCTION public.check_age_gate() SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'set_updated_at') THEN
    ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
  END IF;
END $$;


-- ─── 2. Revoke Direct Execution of SECURITY DEFINER Functions (lint 0028/0029) 
-- Functions defined as SECURITY DEFINER must not be exposed to anon or unprivileged roles via RPC

DO $$
BEGIN
  -- 2.1 Trigger function check_age_gate (invoked by trigger, not via RPC)
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'check_age_gate') THEN
    REVOKE EXECUTE ON FUNCTION public.check_age_gate() FROM PUBLIC, anon, authenticated;
  END IF;

  -- 2.2 Trigger function set_updated_at (invoked by trigger, not via RPC)
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'set_updated_at') THEN
    REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
  END IF;

  -- 2.3 Admin maintenance procedure clear_app_error_history (service_role only)
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'clear_app_error_history') THEN
    REVOKE EXECUTE ON FUNCTION public.clear_app_error_history(integer) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.clear_app_error_history(integer) TO service_role;
  END IF;

  -- 2.4 Event trigger rls_auto_enable (if present)
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;';
  END IF;
END $$;


-- ─── 3. Tighten Overly Permissive RLS Policies (lint 0024) ────────────────────

-- 3.1 feedback_annotations: Replace WITH CHECK (true) with staff validation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'feedback_annotations' 
      AND policyname = 'Staff can update any feedback'
  ) THEN
    ALTER POLICY "Staff can update any feedback" ON public.feedback_annotations
      WITH CHECK (
        (SELECT role FROM public.users WHERE id = private.current_app_user_id()) 
         IN ('admin', 'vet', 'veterinarian')
      );
  END IF;
END $$;

-- 3.2 rate_limits: Drop permissive allow_all_admins (which lacked TO clause)
-- Restrict full management to service_role, authenticated users can only view their own
DROP POLICY IF EXISTS "allow_all_admins" ON public.rate_limits;

DROP POLICY IF EXISTS "service_role_all_rate_limits" ON public.rate_limits;
CREATE POLICY "service_role_all_rate_limits" ON public.rate_limits
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "users_read_own_rate_limits" ON public.rate_limits;
CREATE POLICY "users_read_own_rate_limits" ON public.rate_limits
  FOR SELECT TO authenticated
  USING (user_id = private.current_app_user_id());


-- ─── 4. Prevent Public Listing of Storage Bucket pet-avatars (lint 0025) ─────
-- Public bucket direct URLs still work for file downloads without RLS listing.
-- Scopes SELECT to only allow authenticated users to list objects in their own folder.

DROP POLICY IF EXISTS "pet_avatars_public_read" ON storage.objects;

DROP POLICY IF EXISTS "pet_avatars_owner_read" ON storage.objects;
CREATE POLICY "pet_avatars_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pet-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ─── 5. Resolve GraphQL Schema Exposure (lint 0026 & 0027) ───────────────────
-- AnimalMind communicates strictly via tRPC and PostgREST REST APIs.
-- Dropping pg_graphql closes the /graphql/v1 introspection surface entirely.

DROP EXTENSION IF EXISTS pg_graphql CASCADE;


-- ─── 6. Define Policies for Tables with RLS Enabled (lint 0008) ───────────────
-- Tables enabled with RLS but without policies block all API access and trigger lint 0008.
-- Define explicit access control rules:

-- 6.1 audit_logs: service_role has full control, admins can view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
    DROP POLICY IF EXISTS "service_role_all_audit_logs" ON public.audit_logs;
    CREATE POLICY "service_role_all_audit_logs" ON public.audit_logs
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);

    DROP POLICY IF EXISTS "admins_read_audit_logs" ON public.audit_logs;
    CREATE POLICY "admins_read_audit_logs" ON public.audit_logs
      FOR SELECT TO authenticated
      USING (
        (SELECT role FROM public.users WHERE id = private.current_app_user_id()) = 'admin'
      );
  END IF;
END $$;

-- 6.2 classifications: internal ML telemetry table (service_role full access, admins read)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'classifications') THEN
    DROP POLICY IF EXISTS "service_role_all_classifications" ON public.classifications;
    CREATE POLICY "service_role_all_classifications" ON public.classifications
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);

    DROP POLICY IF EXISTS "admins_read_classifications" ON public.classifications;
    CREATE POLICY "admins_read_classifications" ON public.classifications
      FOR SELECT TO authenticated
      USING (
        (SELECT role FROM public.users WHERE id = private.current_app_user_id()) = 'admin'
      );
  END IF;
END $$;

-- 6.3 Legacy / internal tables (family_animal_access, family_invites, family_plans):
-- Enforce explicit service_role access so unauthenticated/unprivileged access is blocked
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'family_animal_access') THEN
    DROP POLICY IF EXISTS "service_role_family_animal_access" ON public.family_animal_access;
    CREATE POLICY "service_role_family_animal_access" ON public.family_animal_access
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'family_invites') THEN
    DROP POLICY IF EXISTS "service_role_family_invites" ON public.family_invites;
    CREATE POLICY "service_role_family_invites" ON public.family_invites
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'family_plans') THEN
    DROP POLICY IF EXISTS "service_role_family_plans" ON public.family_plans;
    CREATE POLICY "service_role_family_plans" ON public.family_plans
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;


-- ─── 7. Reload PostgREST Cache ────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;
