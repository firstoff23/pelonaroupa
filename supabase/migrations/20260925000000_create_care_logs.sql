-- AnimalMind - Quadro de Cuidados Diários / Coordenação Familiar (Inspiração 4 - Fetch)
-- Tabela care_logs para coordenação de tarefas diárias entre co-tutores

CREATE TABLE IF NOT EXISTS public.care_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  animal_id BIGINT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  care_type VARCHAR(50) NOT NULL,    -- 'feeding', 'medication', 'walk', 'hygiene', 'other'
  care_subtype VARCHAR(50),          -- 'breakfast', 'lunch', 'dinner', 'pill', 'ointment', etc.
  title VARCHAR(150) NOT NULL,
  notes TEXT,
  care_date DATE NOT NULL,          -- 'YYYY-MM-DD' no timezone familiar
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de desempenho para pesquisa diária por animal
CREATE INDEX IF NOT EXISTS idx_care_logs_animal_care_date
  ON public.care_logs(animal_id, care_date);

CREATE INDEX IF NOT EXISTS idx_care_logs_user_id
  ON public.care_logs(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_logs TO authenticated, service_role;

-- RLS Obrigatória
ALTER TABLE public.care_logs ENABLE ROW LEVEL SECURITY;

-- Helper RLS function para verificar se o utilizador pode aceder ao animal
CREATE OR REPLACE FUNCTION private.can_access_animal(check_animal_id BIGINT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.animals a
    WHERE a.id = check_animal_id
      AND a.user_id = private.current_app_user_id()
  ) OR EXISTS (
    SELECT 1
    FROM public.family_animals fa
    JOIN public.family_members fm ON fm.family_id = fa.family_id
    WHERE fa.animal_id = check_animal_id
      AND fm.user_id = private.current_app_user_id()
  );
$$;

GRANT EXECUTE ON FUNCTION private.can_access_animal(BIGINT) TO authenticated, service_role;

DROP POLICY IF EXISTS "users_read_care_logs" ON public.care_logs;
CREATE POLICY "users_read_care_logs"
ON public.care_logs
FOR SELECT
USING (
  private.can_access_animal(care_logs.animal_id)
);

DROP POLICY IF EXISTS "users_insert_care_logs" ON public.care_logs;
CREATE POLICY "users_insert_care_logs"
ON public.care_logs
FOR INSERT
WITH CHECK (
  user_id = private.current_app_user_id()
  AND private.can_access_animal(care_logs.animal_id)
);

DROP POLICY IF EXISTS "users_delete_own_care_logs" ON public.care_logs;
CREATE POLICY "users_delete_own_care_logs"
ON public.care_logs
FOR DELETE
USING (
  user_id = private.current_app_user_id()
);
