-- ============================================================================
-- Migration: 20261001000000_mfa_rate_limit.sql
-- Description: Add rate-limiting and account lockout columns for TOTP MFA
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mfa_failed_attempts INT DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS mfa_locked_until TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_users_mfa_locked
  ON public.users(mfa_locked_until)
  WHERE mfa_locked_until IS NOT NULL;

COMMENT ON COLUMN public.users.mfa_failed_attempts IS 'Number of consecutive failed TOTP verification attempts';
COMMENT ON COLUMN public.users.mfa_locked_until IS 'Timestamp until which TOTP verification is temporarily locked due to too many failed attempts';

NOTIFY pgrst, 'reload schema';
