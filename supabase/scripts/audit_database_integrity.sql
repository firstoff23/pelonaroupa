-- ============================================================================
-- PeloNaRoupa / AnimalMind – Auditoria de Integridade e Modelação Relacional
-- ============================================================================
-- Aplicação dos conceitos da disciplina de Modelação de Bases de Dados:
-- 1. Verificação de Integridade Referencial (Deteção de Registos Órfãos)
-- 2. Auditoria de Restrições de Domínio (Constraints CHECK)
-- 3. Verificação de Políticas de Segurança (Row Level Security - RLS)
-- 4. Análise de Cobertura de Índices em Chaves Estrangeiras (Performance)
--
-- Pode ser executado com segurança no Supabase SQL Editor (operações Read-Only).
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Iniciando Auditoria de Integridade Relacional do Sistema PeloNaRoupa...';
END;
$$;

-- 1. Auditoria de Tabelas com Row Level Security (RLS)
-- Todos os dados de utilizadores e animais devem estar protegidos por RLS
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_ativo,
  CASE
    WHEN rowsecurity = TRUE THEN '✅ CONFORME (RLS Ativo)'
    ELSE '⚠️ ALERTA (RLS Desativado)'
  END AS status_seguranca
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Verificação de Chaves Estrangeiras Órfãs (Integridade Referencial)
-- Garante que não existem eventos ou cuidados associados a animais inexistentes

-- 2.1 classification_events -> animals
SELECT 'classification_events -> animals' AS relacao,
       COUNT(*) AS registos_orfaos
FROM public.classification_events ce
LEFT JOIN public.animals a ON a.id = ce.animal_id
WHERE a.id IS NULL;

-- 2.2 care_logs -> animals (Inspiração 4)
SELECT 'care_logs -> animals' AS relacao,
       COUNT(*) AS registos_orfaos
FROM public.care_logs cl
LEFT JOIN public.animals a ON a.id = cl.animal_id
WHERE a.id IS NULL;

-- 2.3 animal_personalities -> animals (Inspiração 5)
SELECT 'animal_personalities -> animals' AS relacao,
       COUNT(*) AS registos_orfaos
FROM public.animal_personalities ap
LEFT JOIN public.animals a ON a.id = ap.animal_id
WHERE a.id IS NULL;

-- 2.4 animals -> users
SELECT 'animals -> users' AS relacao,
       COUNT(*) AS registos_orfaos
FROM public.animals a
LEFT JOIN public.users u ON u.id = a.user_id
WHERE u.id IS NULL;

-- 3. Verificação de Restrições de Domínio (CHECK constraints)
-- Auditoria às 5 dimensões de personalidade (1 a 5) e confiança (0.0 a 1.0)
SELECT
  id,
  animal_id,
  vocal_expressiveness,
  stress_resilience,
  energy_level,
  sociability,
  independence,
  confidence,
  source
FROM public.animal_personalities
WHERE vocal_expressiveness NOT BETWEEN 1 AND 5
   OR stress_resilience NOT BETWEEN 1 AND 5
   OR energy_level NOT BETWEEN 1 AND 5
   OR sociability NOT BETWEEN 1 AND 5
   OR independence NOT BETWEEN 1 AND 5
   OR confidence NOT BETWEEN 0 AND 1;

-- 4. Verificação de Índices Existentes nas Chaves Estrangeiras
-- Melhora a performance das junções e consultas relacionais
SELECT
  t.relname AS tabela,
  i.relname AS indice,
  a.attname AS coluna
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname IN ('animals', 'classification_events', 'care_logs', 'animal_personalities', 'family_animals')
ORDER BY t.relname, a.attname;
