-- Migration: drop_redundant_indexes
-- Otimização de Performance e Eliminação de Índices Redundantes
--
-- Auditoria de pg_stat_user_indexes confirmou redundâncias que aumentavam
-- o custo de escrita (I/O) sem benefício nas consultas:
--
-- 1. idx_classifications_created_at vs idx_classification_events_created_at:
--    Ambos indexavam classification_events(created_at). O índice DESC mais antigo
--    já cobre as ordenações. O índice idx_classifications_created_at é redundante.
--
-- 2. idx_animal_personalities_animal_id vs animal_personalities_animal_id_key:
--    A restrição UNIQUE(animal_id) cria automaticamente um índice B-Tree único no PostgreSQL.
--    O índice secundário idx_animal_personalities_animal_id é 100% redundante.
--
-- 3. idx_family_animals_animal_id:
--    Remoção de índice redundante sobre a tabela associativa family_animals.
--
-- 4. Criação do índice composto crítico:
--    idx_classification_events_animal_created ON classification_events(animal_id, created_at DESC)
--    Cobre de forma ótima as consultas da timeline, estatísticas do dashboard, tendências e narrativa semanal.

-- ─── 1. Eliminação dos Índices Redundantes ───────────────────────────────────

-- 1.1 Índice duplicado em classification_events(created_at)
DROP INDEX IF EXISTS public.idx_classifications_created_at;

-- 1.2 Índice redundante com a restrição UNIQUE(animal_id) em animal_personalities
DROP INDEX IF EXISTS public.idx_animal_personalities_animal_id;

-- 1.3 Índice redundante na tabela family_animals
DROP INDEX IF EXISTS public.idx_family_animals_animal_id;

-- ─── 2. Criação do Índice Composto Crítico ────────────────────────────────────

-- Acelera consultas frequentes filtradas por animal e ordenadas cronologicamente
CREATE INDEX IF NOT EXISTS idx_classification_events_animal_created
  ON public.classification_events (animal_id, created_at DESC);

-- ─── 3. Recarregar Schema Cache do PostgREST ──────────────────────────────────
NOTIFY pgrst, 'reload schema';
