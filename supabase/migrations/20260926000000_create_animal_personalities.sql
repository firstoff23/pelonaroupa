-- Migration: create_animal_personalities
-- Inspiração 5 – Perfil de Personalidade Comportamental
--
-- Stores inferred + user-contributed personality dimensions for each animal.
-- Each dimension is stored as an explicit column (integer 1-5) rather than JSONB,
-- allowing column-level constraints and clean foreign-key semantics.
--
-- Visibility: tutor (owner/family) and vet only. Never public.

CREATE TABLE IF NOT EXISTS public.animal_personalities (
  id                    BIGSERIAL PRIMARY KEY,
  animal_id             BIGINT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,

  -- ─── The 5 behavioral dimensions (1 = low, 5 = high) ─────────────────────
  vocal_expressiveness  SMALLINT NOT NULL DEFAULT 3 CHECK (vocal_expressiveness BETWEEN 1 AND 5),
  stress_resilience     SMALLINT NOT NULL DEFAULT 3 CHECK (stress_resilience    BETWEEN 1 AND 5),
  energy_level          SMALLINT NOT NULL DEFAULT 3 CHECK (energy_level         BETWEEN 1 AND 5),
  sociability           SMALLINT NOT NULL DEFAULT 3 CHECK (sociability          BETWEEN 1 AND 5),
  independence          SMALLINT NOT NULL DEFAULT 3 CHECK (independence         BETWEEN 1 AND 5),

  -- ─── Confidence + source metadata ────────────────────────────────────────
  -- confidence: 0.0–1.0 (1.0 = fully inferred from rich dataset)
  confidence            NUMERIC(4,3) NOT NULL DEFAULT 0.0 CHECK (confidence BETWEEN 0 AND 1),

  -- source: 'inferred' (from classification events) | 'user' (tutor override) | 'blended'
  source                TEXT NOT NULL DEFAULT 'inferred'
                        CHECK (source IN ('inferred', 'user', 'blended')),

  -- Number of events used for last inference run (for display + staleness)
  events_used           INTEGER NOT NULL DEFAULT 0 CHECK (events_used >= 0),

  -- ─── Timestamps ──────────────────────────────────────────────────────────
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One row per animal (upsert on animal_id)
  UNIQUE (animal_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_animal_personalities_updated_at ON public.animal_personalities;
CREATE TRIGGER trg_animal_personalities_updated_at
  BEFORE UPDATE ON public.animal_personalities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_animal_personalities_animal_id
  ON public.animal_personalities (animal_id);

-- ─── Permissions & Row Level Security ─────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.animal_personalities TO authenticated, service_role;

ALTER TABLE public.animal_personalities ENABLE ROW LEVEL SECURITY;

-- Helper schema & functions (idempotent and resilient)
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
  WHERE email = (auth.jwt() ->> 'email')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.can_access_animal(check_animal_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id BIGINT;
  v_has_access BOOLEAN := FALSE;
BEGIN
  v_user_id := private.current_app_user_id();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Direct owner
  SELECT EXISTS (
    SELECT 1 FROM public.animals a
    WHERE a.id = check_animal_id AND a.user_id = v_user_id
  ) INTO v_has_access;

  IF v_has_access THEN
    RETURN TRUE;
  END IF;

  -- 2. Family member (if family_animals exists)
  IF to_regclass('public.family_animals') IS NOT NULL AND to_regclass('public.family_members') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (
      SELECT 1 FROM public.family_animals fa
      JOIN public.family_members fm ON fm.family_id = fa.family_id
      WHERE fa.animal_id = $1 AND fm.user_id = $2
    )' INTO v_has_access USING check_animal_id, v_user_id;

    IF v_has_access THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- 3. Vet access (if vet_pet_access or vet_shares exists)
  IF to_regclass('public.vet_pet_access') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (
      SELECT 1 FROM public.vet_pet_access vpa
      WHERE vpa.animal_id = $1
        AND vpa.status = ''active''
        AND (vpa.vet_user_id = $2 OR LOWER(vpa.vet_email) = LOWER(COALESCE(auth.jwt() ->> ''email'', '''')))
    )' INTO v_has_access USING check_animal_id, v_user_id;

    IF v_has_access THEN
      RETURN TRUE;
    END IF;
  ELSIF to_regclass('public.vet_shares') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (
      SELECT 1 FROM public.vet_shares vs
      WHERE vs.animal_id = $1
        AND (vs.status IS NULL OR vs.status = ''active'')
        AND (vs.vet_user_id = $2 OR LOWER(vs.vet_email) = LOWER(COALESCE(auth.jwt() ->> ''email'', '''')))
    )' INTO v_has_access USING check_animal_id, v_user_id;

    IF v_has_access THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_app_user_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_access_animal(BIGINT) TO authenticated, service_role;

-- Policy: read personality (tutor, family, vet)
DROP POLICY IF EXISTS "access_animal_personalities_select" ON public.animal_personalities;
DROP POLICY IF EXISTS "owner_rw_personality" ON public.animal_personalities;
DROP POLICY IF EXISTS "family_read_personality" ON public.animal_personalities;
DROP POLICY IF EXISTS "vet_read_personality" ON public.animal_personalities;

CREATE POLICY "access_animal_personalities_select"
  ON public.animal_personalities
  FOR SELECT
  TO authenticated
  USING (
    private.can_access_animal(animal_personalities.animal_id)
  );

-- Policy: manage personality (owner / family)
DROP POLICY IF EXISTS "access_animal_personalities_insert" ON public.animal_personalities;
CREATE POLICY "access_animal_personalities_insert"
  ON public.animal_personalities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.can_access_animal(animal_personalities.animal_id)
  );

DROP POLICY IF EXISTS "access_animal_personalities_update" ON public.animal_personalities;
CREATE POLICY "access_animal_personalities_update"
  ON public.animal_personalities
  FOR UPDATE
  TO authenticated
  USING (
    private.can_access_animal(animal_personalities.animal_id)
  )
  WITH CHECK (
    private.can_access_animal(animal_personalities.animal_id)
  );

DROP POLICY IF EXISTS "access_animal_personalities_delete" ON public.animal_personalities;
CREATE POLICY "access_animal_personalities_delete"
  ON public.animal_personalities
  FOR DELETE
  TO authenticated
  USING (
    private.can_access_animal(animal_personalities.animal_id)
  );

COMMENT ON TABLE  public.animal_personalities                    IS 'Behavioral personality profile per animal (Inspiração 5). One row per animal, upserted after each inference run.';
COMMENT ON COLUMN public.animal_personalities.vocal_expressiveness IS 'How vocal/expressive the animal is (1=silent, 5=highly vocal). Inferred from distress/excitement event frequency.';
COMMENT ON COLUMN public.animal_personalities.stress_resilience    IS 'How quickly the animal returns to calm after distress (1=very sensitive, 5=very resilient).';
COMMENT ON COLUMN public.animal_personalities.energy_level         IS 'Overall activity/energy level (1=low, 5=high). Inferred from excitement/activity distribution.';
COMMENT ON COLUMN public.animal_personalities.sociability          IS 'Tendency to seek interaction (1=independent, 5=very social). Inferred from attention state frequency.';
COMMENT ON COLUMN public.animal_personalities.independence         IS 'Self-sufficiency vs need for reassurance (1=clingy, 5=independent). Inferred from hunger/distress patterns.';
COMMENT ON COLUMN public.animal_personalities.confidence           IS 'Inference confidence 0–1. Rises with more events. Below 0.4 = show as provisional.';
COMMENT ON COLUMN public.animal_personalities.source               IS 'inferred (ML), user (tutor override), blended (both).';
