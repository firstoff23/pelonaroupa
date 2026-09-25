-- Migration: fix_veterinary_animals_rls
-- Resolução de Vulnerabilidade RLS: Acesso não autorizado de veterinários a animais não partilhados
--
-- Problema: Utilizadores com role 'vet', 'veterinarian', 'clinic_admin' ou 'admin'
-- tinham visibilidade de todos os animais da tabela public.animals mesmo sem
-- partilha ativa em vet_pet_access ou vet_shares.
--
-- Solução:
-- 1. Eliminar policies permissivas legadas em public.animals e public.classification_events.
-- 2. Recriar policies estritas que obrigam a verificação de partilha ativa (status = 'active' E revoked_at IS NULL).

-- ─── 1. Limpeza de Policies Legadas em public.animals ──────────────────────────
DROP POLICY IF EXISTS "veterinary_read_shared_animals_v2" ON public.animals;
DROP POLICY IF EXISTS "veterinary_read_shared_animals" ON public.animals;
DROP POLICY IF EXISTS "vets_read_shared_animals" ON public.animals;
DROP POLICY IF EXISTS "vets_read_all_animals" ON public.animals;
DROP POLICY IF EXISTS "veterinarians_select_animals" ON public.animals;
DROP POLICY IF EXISTS "allow_vets_read_animals" ON public.animals;
DROP POLICY IF EXISTS "vets_select_animals" ON public.animals;
DROP POLICY IF EXISTS "veterinary_read_animals" ON public.animals;
DROP POLICY IF EXISTS "vets_read_animals" ON public.animals;
DROP POLICY IF EXISTS "staff_read_all_animals" ON public.animals;
DROP POLICY IF EXISTS "select_animals" ON public.animals;
DROP POLICY IF EXISTS "veterinary_read_shared_animals_strict" ON public.animals;

-- ─── 2. Criar Policy Estrita para Veterinários em public.animals ───────────────
CREATE POLICY "veterinary_read_shared_animals_strict"
ON public.animals
FOR SELECT
TO authenticated
USING (
  private.current_user_is_veterinary()
  AND (
    -- 2.1 Verificação em vet_pet_access (status = 'active')
    (to_regclass('public.vet_pet_access') IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.vet_pet_access vpa
      WHERE vpa.animal_id = animals.id
        AND vpa.status = 'active'
        AND vpa.revoked_at IS NULL
        AND (
          vpa.vet_user_id = private.current_app_user_id()
          OR LOWER(vpa.vet_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
        )
    ))
    OR
    -- 2.2 Verificação em vet_shares (compatibilidade retroativa, status = 'active')
    (to_regclass('public.vet_shares') IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.vet_shares vs
      WHERE vs.animal_id = animals.id
        AND (vs.status IS NULL OR vs.status = 'active')
        AND vs.revoked_at IS NULL
        AND (
          vs.vet_user_id = private.current_app_user_id()
          OR LOWER(vs.vet_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
        )
    ))
  )
);

-- ─── 3. Limpeza e Policy Estrita em public.classification_events ───────────────
DROP POLICY IF EXISTS "veterinary_read_shared_events_v2" ON public.classification_events;
DROP POLICY IF EXISTS "vets_read_shared_events" ON public.classification_events;
DROP POLICY IF EXISTS "veterinary_read_shared_events_strict" ON public.classification_events;

CREATE POLICY "veterinary_read_shared_events_strict"
ON public.classification_events
FOR SELECT
TO authenticated
USING (
  private.current_user_is_veterinary()
  AND (
    (to_regclass('public.vet_pet_access') IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.vet_pet_access vpa
      WHERE vpa.animal_id = classification_events.animal_id
        AND vpa.status = 'active'
        AND vpa.revoked_at IS NULL
        AND (
          vpa.vet_user_id = private.current_app_user_id()
          OR LOWER(vpa.vet_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
        )
    ))
    OR
    (to_regclass('public.vet_shares') IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.vet_shares vs
      WHERE vs.animal_id = classification_events.animal_id
        AND (vs.status IS NULL OR vs.status = 'active')
        AND vs.revoked_at IS NULL
        AND (
          vs.vet_user_id = private.current_app_user_id()
          OR LOWER(vs.vet_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
        )
    ))
  )
);

-- ─── 4. Recarregar Schema Cache do PostgREST ──────────────────────────────────
NOTIFY pgrst, 'reload schema';
