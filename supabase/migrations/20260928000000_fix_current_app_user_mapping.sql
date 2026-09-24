-- Migration: fix_current_app_user_mapping
-- Mitigação da vulnerabilidade ACH-11 (Account Hijacking / Impersonation via Email)
--
-- Substitui o mapeamento por email pelo identificador criptográfico imutável
-- do Supabase Auth (auth.uid()::text -> public.users.open_id).
-- Auditoria confirmou que 100% dos utilizadores ativos têm open_id preenchido.

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.current_app_user_id()
RETURNS BIGINT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id
  FROM public.users
  WHERE open_id = auth.uid()::text
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.current_app_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role
  FROM public.users
  WHERE open_id = auth.uid()::text
  LIMIT 1
$$;

GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_app_user_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_app_user_role() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
