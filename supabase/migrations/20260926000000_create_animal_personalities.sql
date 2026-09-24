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

-- ─── Row Level Security ───────────────────────────────────────────────────
ALTER TABLE public.animal_personalities ENABLE ROW LEVEL SECURITY;

-- Policy: tutor (direct owner) can read/write their own animals' personalities
CREATE POLICY "owner_rw_personality" ON public.animal_personalities
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    animal_id IN (
      SELECT id FROM public.animals
      WHERE user_id = (
        SELECT id FROM public.users WHERE open_id = auth.uid()::text
      )
    )
  )
  WITH CHECK (
    animal_id IN (
      SELECT id FROM public.animals
      WHERE user_id = (
        SELECT id FROM public.users WHERE open_id = auth.uid()::text
      )
    )
  );

-- Policy: family members (from animal_shares) can read personality
CREATE POLICY "family_read_personality" ON public.animal_personalities
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    animal_id IN (
      SELECT animal_id FROM public.animal_shares
      WHERE shared_with_user_id = (
        SELECT id FROM public.users WHERE open_id = auth.uid()::text
      )
      AND status = 'accepted'
    )
  );

-- Policy: vets can read personality for animals they have access to
CREATE POLICY "vet_read_personality" ON public.animal_personalities
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vet_animal_access vaa
      JOIN public.users u ON u.id = vaa.vet_user_id
      WHERE vaa.animal_id = animal_personalities.animal_id
        AND u.open_id = auth.uid()::text
    )
  );

COMMENT ON TABLE  public.animal_personalities                    IS 'Behavioral personality profile per animal (Inspiração 5). One row per animal, upserted after each inference run.';
COMMENT ON COLUMN public.animal_personalities.vocal_expressiveness IS 'How vocal/expressive the animal is (1=silent, 5=highly vocal). Inferred from distress/excitement event frequency.';
COMMENT ON COLUMN public.animal_personalities.stress_resilience    IS 'How quickly the animal returns to calm after distress (1=very sensitive, 5=very resilient).';
COMMENT ON COLUMN public.animal_personalities.energy_level         IS 'Overall activity/energy level (1=low, 5=high). Inferred from excitement/activity distribution.';
COMMENT ON COLUMN public.animal_personalities.sociability          IS 'Tendency to seek interaction (1=independent, 5=very social). Inferred from attention state frequency.';
COMMENT ON COLUMN public.animal_personalities.independence         IS 'Self-sufficiency vs need for reassurance (1=clingy, 5=independent). Inferred from hunger/distress patterns.';
COMMENT ON COLUMN public.animal_personalities.confidence           IS 'Inference confidence 0–1. Rises with more events. Below 0.4 = show as provisional.';
COMMENT ON COLUMN public.animal_personalities.source               IS 'inferred (ML), user (tutor override), blended (both).';
