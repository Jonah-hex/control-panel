-- ==========================================
-- إصلاح تحذير: Function Search Path Mutable (Security Advisor)
-- Fix: Set search_path on functions to avoid mutable search_path
-- ==========================================
-- نفّذ في Supabase → SQL Editor
-- يزيل تحذير "Function has a role mutable search_path"
-- ==========================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, p.proname AS func_name, pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'set_updated_at',
        'update_dashboard_employees_updated_at',
        'update_updated_at_column',
        'check_building_subscription_limit',
        'handle_new_user'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.schema_name, r.func_name, r.args);
    RAISE NOTICE 'Set search_path for public.%(%)', r.func_name, r.args;
  END LOOP;
END $$;
