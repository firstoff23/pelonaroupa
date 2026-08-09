# PeloNaRoupa Development Documentation

## Original File: AGENTS.md

# Antigravity Developer Agent Instructions (AGENTS.md)

Este documento define as regras fundamentais de desenvolvimento, arquitetura, seguranÃ§a e fluxo de trabalho para agentes de InteligÃªncia Artificial e programadores na base de cÃ³digo do **Pawra**.

---

## ðŸ“‹ Regras de Desenvolvimento e ResiliÃªncia

### R1. ModificaÃ§Ãµes de Texto em Massa (PowerShell / Windows)
* **Problema:** O operador padrÃ£o `-replace` no PowerShell Ã© case-insensitive e deforma a capitalizaÃ§Ã£o original dos nomes de pacotes ou variÃ¡veis (ex: transformando `petsense` em `Pawra` no `package.json`).
* **Regra:** Em substituiÃ§Ãµes automÃ¡ticas de texto em massa utilizando scripts PowerShell, deve ser utilizado obrigatoriamente o operador **`-creplace`** (case-sensitive) para preservar exatamente a capitalizaÃ§Ã£o original dos termos substituÃ­dos.

### R2. ConfiguraÃ§Ã£o do `vercel.json`
* **Problema:** A propriedade `"public": true` em `vercel.json` viola o esquema de validaÃ§Ã£o do deploy da Vercel e quebra o deploy em produÃ§Ã£o.
* **Regra:** O ficheiro `vercel.json` nÃ£o deve conter a propriedade `"public": true` ou quaisquer outros atributos adicionais nÃ£o suportados pelo esquema padrÃ£o do Vercel.

### R3. Conectividade Supabase & DepreciaÃ§Ã£o de IPv6
* **Problema:** As rotas diretas do Supabase (`db.[ref].supabase.co`) sÃ£o apenas IPv6. Ambientes locais sem suporte IPv6 integrado sofrem timeouts imediatos de conexÃ£o (portas 5432/6543).
* **Regra:** Para ligaÃ§Ãµes locais Ã  base de dados, utilize sempre o pooler IPv4 dedicado (ex: `aws-0-eu-west-1.pooler.supabase.com`), configure a porta `6543` (modo de transaÃ§Ã£o) ou `5432` (modo de sessÃ£o), use o formato de utilizador `postgres.[ref]` e desative a verificaÃ§Ã£o rÃ­gida de certificados SSL se necessÃ¡rio via `{ ssl: { rejectUnauthorized: false } }`.

### R4. PermissÃµes de RLS em Tabelas do Schema `storage`
* **Problema:** O utilizador `postgres` padrÃ£o no Supabase nÃ£o Ã© o proprietÃ¡rio do schema `storage`. Tentar executar `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;` via migraÃ§Ãµes SQL falha devido a falta de privilÃ©gios.
* **Regra:** NÃ£o tente ativar ou alterar o RLS diretamente na tabela `storage.objects` atravÃ©s de scripts de migraÃ§Ã£o aplicados pelo utilizador `postgres`. Em vez disso, declare apenas as polÃ­ticas de acesso (`CREATE POLICY`) especÃ­ficas de leitura/escrita para os buckets necessÃ¡rios, jÃ¡ que o RLS nas tabelas do schema `storage` jÃ¡ se encontra ativo por padrÃ£o.

### R5. ConfiguraÃ§Ã£o e uso do Supabase MCP
* **Problema:** O pacote NPM `@supabase/mcp` nÃ£o existe no registo central e causa erros de 404 ao inicializar.
* **Regra:** 
  - Se for utilizar a integraÃ§Ã£o de servidor de MCP remoto oficial, declare-a no ficheiro de configuraÃ§Ã£o como tipo `http` apontando para `https://mcp.supabase.com/mcp` para que o cliente use o fluxo OAuth integrado.
  - Se pretender executar localmente atravÃ©s de `npx`, utilize o nome de pacote correto: `@supabase/mcp-server-supabase`.

---

## ðŸ› ï¸ PadrÃµes e Integridade de CÃ³digo

1. **LocalizaÃ§Ã£o de MigraÃ§Ãµes SQL:**
   * Coloque os ficheiros SQL sempre na pasta `supabase/migrations/`.
   * Toda a migraÃ§Ã£o que altere o esquema do banco de dados deve conter a notificaÃ§Ã£o de recarregamento do PostgREST no final:
     ```sql
     NOTIFY pgrst, 'reload schema';
     ```

2. **SeguranÃ§a de APIs e tRPC:**
   * Valide todos os payloads recebidos nas rotas tRPC usando esquemas `zod` rigorosos.
   * NÃ£o envie segredos ou tokens sensÃ­veis em logs ou no payload pÃºblico.

3. **Integridade EstÃ©tica e Visual:**
   * NÃ£o modifique estilos CSS, temas escuros/claros ou cores da interface do usuÃ¡rio a menos que expressamente solicitado pelo utilizador. Foque sempre na lÃ³gica de negÃ³cio e na correÃ§Ã£o funcional.


## Original File: PROJECT.md

# Project: AnimalMind Self-Healing and Learning System

## Architecture
- **Frontend**: Vite + React, using tRPC hooks (`trpc.useQuery`, `trpc.useMutation`) to interact with the backend, and standard error interceptors.
- **Backend**: Express + tRPC. Connects to Supabase PostgreSQL database using Supabase JS SDK (with Service Role Key for backend bypass or authenticated keys).
- **Database**: Supabase PostgreSQL. Tables with Row Level Security (RLS) configured to allow users to read/write their own logs, and admins to access all logs.

## Code Layout
- `client/src/pages/SettingsPage.tsx` - Settings & Diagnostics dashboard UI
- `client/src/components/ErrorBoundary.tsx` - React Error Boundary
- `client/src/_core/` - Core client helpers and interceptors
- `server/routers/system.ts` or `server/routers/healing.ts` - tRPC Router for Self-Healing
- `server/routers.ts` - Main tRPC router registration
- `server/db.ts` - Database operations mapping to Supabase
- `supabase-migrations/` - Database SQL migrations

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Database & API Setup | Create Supabase migrations for tables; expose tRPC routes for CRUD operations. | None | IN_PROGRESS (Worker ID: 50337803-d97b-4364-ab28-205a04ba9887) |
| 2 | M2: Global Error Capture & Engine | Intercept errors globally on client and backend; build Central Healing Engine. | M1 | PLANNED |
| 3 | M3: Recovery & Learning | Implement backoff, fallbacks, heuristics, and adaptive learning strategies. | M2 | PLANNED |
| 4 | M4: Settings Diagnostics UI | Add diagnostics dashboard to Settings page. | M1 | PLANNED |
| 5 | M5: E2E Verification & Hardening | Verify all requirements pass; add adversarial tests (Tier 5). | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### Supabase Table Schemas

#### `app_errors`
- `id` (bigint, primary key, generated always as identity)
- `user_id` (bigint, references public.users(id) on delete cascade)
- `session_id` (text, not null)
- `route` (text, not null)
- `module` (text, not null)
- `error_type` (text, not null)
- `error_code` (text)
- `message` (text, not null)
- `context` (jsonb, default '{}')
- `frequency` (int, default 1)
- `status` (text, default 'unresolved') -- unresolved, resolving, resolved, failed
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

#### `app_healing_actions`
- `id` (bigint, primary key, generated always as identity)
- `error_id` (bigint, references public.app_errors(id) on delete cascade)
- `strategy` (text, not null)
- `attempt_number` (int, not null)
- `status` (text, default 'attempted') -- attempted, succeeded, failed
- `details` (jsonb, default '{}')
- `created_at` (timestamptz, default now())

#### `app_health_state`
- `id` (bigint, primary key, generated always as identity)
- `user_id` (bigint, references public.users(id) on delete cascade)
- `module` (text, not null) -- api, classification, camera, ui, auth, routing
- `status` (text, default 'healthy') -- healthy, degraded, down
- `last_checked` (timestamptz, default now())
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())
- UNIQUE (user_id, module)

### tRPC Router: `healing`
- `logError`: Mutation to record/increment an error.
- `getRecentErrors`: Query to retrieve error logs.
- `getHealingHistory`: Query to fetch attempted auto-fixes.
- `getHealthState`: Query to get current health state.
- `clearHistory`: Mutation to reset/clear error log and healing actions for the user.


## Original File: WORKFLOW.md

# ðŸ”„ Workflow de Desenvolvimento â€” AnimalMind

## Ferramentas e onde vivem

| Ferramenta | Plataforma | Uso |
|------------|------------|-----|
| **Antigravity** | PC | AlteraÃ§Ãµes de cÃ³digo complexas, features novas |
| **Codex** | PC | AlteraÃ§Ãµes de cÃ³digo, refactoring |
| **Manus** | TelemÃ³vel | Features rÃ¡pidas, fixes, no movimento |
| **GitHub** | Cloud | Fonte Ãºnica da verdade â€” todo o cÃ³digo vive aqui |
| **Vercel** | Cloud | Deploy automÃ¡tico a cada push para `main` |

---

## Fluxo de trabalho

```
Manus / Antigravity / Codex
         â”‚
         â”‚ git push â†’ main
         â–¼
   github.com/firstoff23/AnimalMind
         â”‚
         â”‚ webhook automÃ¡tico
         â–¼
   animalmind.vercel.app (produÃ§Ã£o)
```

### âœ… Regras simples

1. **Antes de comeÃ§ar:** `git pull` para ter o cÃ³digo mais recente
2. **Ao terminar:** `git add . && git commit -m "descriÃ§Ã£o" && git push`
3. **O Vercel faz o deploy automaticamente** apÃ³s cada push para `main`
4. **Nunca commites:** `node_modules/`, `dist/`, `.env`, `.vercel/`

---

## Antigravity (PC)

```bash
# LocalizaÃ§Ã£o do clone local
C:\Users\Alexandre\.gemini\antigravity\scratch\AnimalMindFix

# Antes de trabalhar
git pull

# Depois de trabalhar
git add .
git commit -m "feat: descriÃ§Ã£o da alteraÃ§Ã£o"
git push
```

## Manus (TelemÃ³vel)

No Manus, garantir que o projeto estÃ¡ ligado ao repositÃ³rio:
- **GitHub:** `firstoff23/AnimalMind`
- **Branch:** `main`

O Manus deve fazer `pull` antes de iniciar e `push` ao terminar.

---

## VariÃ¡veis de Ambiente (Supabase)

EstÃ£o configuradas no Vercel e sÃ£o injetadas automaticamente na compilaÃ§Ã£o.  
**NÃ£o precisas de um ficheiro `.env` no repo.**

| VariÃ¡vel | Onde estÃ¡ |
|----------|-----------|
| `VITE_SUPABASE_URL` | Vercel â†’ Settings â†’ Environment Variables |
| `VITE_SUPABASE_ANON_KEY` | Vercel â†’ Settings â†’ Environment Variables |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel â†’ Settings â†’ Environment Variables |

Para desenvolvimento local, pede as keys ao Vercel:
```bash
npx vercel env pull .env.local
```

---

## Links Ãºteis

- **App em produÃ§Ã£o:** https://animalmind.vercel.app
- **RepositÃ³rio:** https://github.com/firstoff23/AnimalMind
- **Dashboard Vercel:** https://vercel.com/firstoff23s-projects/animalmind
- **Supabase:** https://supabase.com/dashboard/project/yuzqxrmtbqlnalpjehno


## Original File: task.md

# Checklist de ImplementaÃ§Ã£o â€” DicionÃ¡rio de Alimentos

## 1. Base de Dados
- [x] Criar ficheiro de migraÃ§Ã£o `supabase-migrations/20260608_food_dictionary.sql`
- [x] Implementar a tabela `foods` com constrangimentos, RLS e polÃ­ticas de acesso pÃºblico/admin
- [x] Criar script de seed SQL populando pelo menos 30 alimentos detalhados em portuguÃªs

## 2. Camada de Dados & Backend
- [x] Adicionar interface `Food` em `shared/dbTypes.ts`
- [x] Adicionar helpers de base de dados em `server/db.ts` (`getFoods`, `getFoodById`, `searchFoods`)
- [x] Criar o router tRPC `server/routers/foods.ts`
- [x] Registar o router `foods` em `server/routers.ts`

## 3. Interface do Utilizador (Frontend)
- [x] Criar a pÃ¡gina de pesquisa `/alimentos` em `client/src/pages/FoodSearchPage.tsx`
- [x] Adicionar atalho e aba "Alimentos" no `client/src/components/BottomNav.tsx`
- [x] Adicionar ligaÃ§Ã£o "/alimentos" na `client/src/components/Sidebar.tsx`
- [x] Registar a rota `/alimentos` protegida no `client/src/App.tsx`
- [x] Adicionar atalho para alimentos na pÃ¡gina principal do `client/src/pages/DashboardPage.tsx`

## Fase 2: VerificaÃ§Ã£o de Build

- [x] Executar `pnpm run check` para validaÃ§Ã£o TypeScript
- [x] Executar `pnpm test` para conformidade da suite de testes
- [x] Executar `pnpm run build` para build limpo

## Fase 3: Auditoria Visual (Chrome DevTools)

- [x] Screenshot `/dashboard` mobile + desktop
- [x] Screenshot `/perfil` mobile
- [x] Screenshot `/historico` mobile
- [x] Screenshot `/alimentos` mobile
- [x] Screenshot `/definicoes` mobile
- [x] Verificar que zero emojis sÃ£o visÃ­veis
- [x] Atualizar `walkthrough.md`


## Original File: todo.md

# AnimalMind â€” TODO

## Base de Dados & Backend
- [x] Schema: tabelas animals e classification_events no drizzle/schema.ts
- [x] MigraÃ§Ã£o SQL aplicada via webdev_execute_sql
- [x] Seed: Bobi (Labrador ðŸ•) e Mimi (Persa ðŸˆ) prÃ©-carregados
- [x] Router tRPC: classify (POST simulado, 2s delay, 6 estados)
- [x] Router tRPC: animals (list, add, setActive, getStats)
- [x] Router tRPC: events (list paginado, filtros por estado/data, feedback)
- [x] Router tRPC: settings (get, update, exportCSV)

## Tema & Layout
- [x] index.css: dark mode slate-950, cor de acÃ§Ã£o #10b981
- [x] App.tsx: rotas e ThemeProvider dark por defeito
- [x] BottomNav: 5 Ã­cones (GravaÃ§Ã£o, Perfil, HistÃ³rico, Dashboard, DefiniÃ§Ãµes)
- [x] TransiÃ§Ãµes suaves entre pÃ¡ginas

## PÃ¡gina de GravaÃ§Ã£o
- [x] BotÃ£o circular w-40 h-40 com 3 estados (verde/vermelho pulse/amarelo)
- [x] LÃ³gica de gravaÃ§Ã£o simulada 3 segundos
- [x] ResultCard: emoji 6xl, nome PT, barra de confianÃ§a colorida, badge modelo, botÃµes feedback
- [x] HistÃ³rico das Ãºltimas 5 classificaÃ§Ãµes
- [x] NotificaÃ§Ãµes push: pedir permissÃ£o, enviar para distress/hunger, anti-spam 10min

## PÃ¡gina de Perfil do Animal
- [x] Cards horizontais com scroll para seleccionar animal activo
- [x] FormulÃ¡rio: nome, espÃ©cie, raÃ§a, idade
- [x] Mini grÃ¡fico de distribuiÃ§Ã£o de estados da semana

## PÃ¡gina de HistÃ³rico
- [x] Lista paginada de eventos
- [x] Filtro por estado emocional e por data
- [x] Empty state simpÃ¡tico

## PÃ¡gina de Dashboard
- [x] GrÃ¡fico de barras: distribuiÃ§Ã£o dos 6 estados (Recharts)
- [x] GrÃ¡fico de linha: evoluÃ§Ã£o da confianÃ§a mÃ©dia semanal (Recharts)
- [x] Card: estado dominante do dia e percentagem
- [x] Dados simulados Bobi e Mimi

## PÃ¡gina de DefiniÃ§Ãµes
- [x] Toggle notificaÃ§Ãµes
- [x] Sensibilidade de alertas (baixa/mÃ©dia/alta)
- [x] BotÃ£o exportar CSV
- [x] SecÃ§Ã£o "Sobre" com versÃ£o 0.1.0

## Testes
- [x] Vitest: router classify
- [x] Vitest: router animals
- [x] Vitest: router events


## IntegraÃ§Ã£o Supabase
- [x] Configurar secrets: SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY
- [x] Instalar @supabase/supabase-js
- [x] Criar schema no Supabase (tabelas: users, animals, classification_events, settings)
- [x] Actualizar server/db.ts para usar cliente Supabase com Service Role Key
- [x] Migrar dados demo (Bobi, Mimi) para Supabase
- [x] Testes de integraÃ§Ã£o Supabase (4 testes a passar)
- [x] Todos os 14 testes Vitest a passar


## AutenticaÃ§Ã£o Supabase Auth
- [x] Instalar @supabase/auth-helpers-react e @supabase/supabase-js
- [x] Criar AuthContext com useAuth() hook
- [x] Criar pÃ¡gina de Login com email + password
- [x] Criar pÃ¡gina de Registo com nome + email + password
- [x] Implementar protecÃ§Ã£o de rotas (ProtectedRoute component)
- [x] Adicionar header com email do utilizador e botÃ£o logout
- [x] Testar fluxo completo: registo â†’ login â†’ acesso protegido â†’ logout
- [x] Vitest: testes de autenticaÃ§Ã£o (3 testes a passar)


## RecuperaÃ§Ã£o de Palavra-passe
- [x] PÃ¡gina /forgot-password com formulÃ¡rio de email
- [x] PÃ¡gina /reset-password com novo formulÃ¡rio de palavra-passe
- [x] IntegraÃ§Ã£o com Supabase Auth resetPasswordForEmail
- [x] ValidaÃ§Ã£o de token de reset
- [x] Testes Vitest (4 testes a passar)

## VerificaÃ§Ã£o de Email
- [x] VerificaÃ§Ã£o obrigatÃ³ria apÃ³s registo
- [x] Link de verificaÃ§Ã£o no email
- [x] PÃ¡gina de confirmaÃ§Ã£o de email (/verify-email)
- [x] Re-envio de link de verificaÃ§Ã£o
- [x] AuthContext com isEmailVerified e resendVerificationEmail

## Perfil do Utilizador
- [x] PÃ¡gina /user-profile com formulÃ¡rio de ediÃ§Ã£o
- [x] Campos: nome, email, estado da conta
- [x] AtualizaÃ§Ã£o de dados no Supabase
- [x] SincronizaÃ§Ã£o com tabela users
- [x] ExibiÃ§Ã£o de estado de verificaÃ§Ã£o de email
- [x] Todos os 24 testes Vitest a passar

## Fluxo de Onboarding
- [x] Componente React/TypeScript: OnboardingFlow.tsx em client/src/components/
- [x] Uso de Framer Motion para transiÃ§Ãµes animadas entre os 4 ecrÃ£s
- [x] PersistÃªncia da flag onboarding_completed na tabela users do Supabase
- [x] IntegraÃ§Ã£o com as pÃ¡ginas e autenticaÃ§Ã£o em App.tsx



## Original File: walkthrough.md

# Pawra â€” Walkthrough das Novas Funcionalidades e Self-Healing

Este documento resume a migraÃ§Ã£o, implementaÃ§Ã£o, verificaÃ§Ã£o e persistÃªncia de dados para as Ãºltimas atualizaÃ§Ãµes do Pawra, com destaque especial para o **Modo VeterinÃ¡rio**, **Modo FamÃ­lia**, **Landing Page**, **SeguranÃ§a de Endpoints**, **Sistema de Self-Healing com Aprendizagem**, **DicionÃ¡rio de Alimentos** e o **Registo de Sintomas (Symptom Logger) & ExportaÃ§Ã£o PDF**.

---

## ðŸš€ 1. Sistema de Self-Healing com Aprendizagem (RecÃ©m-Ativado) âœ…

Com a aplicaÃ§Ã£o bem-sucedida do ficheiro de migraÃ§Ã£o `20260605_self_healing_foundation.sql` no Supabase, a persistÃªncia e inteligÃªncia de auto-recuperaÃ§Ã£o da app estÃ£o totalmente operacionais.

### Arquitetura e Componentes:
1. **Captura Global de Erros (`SelfHealingContext.tsx`):**
   * Intercepta `window.onerror` and `unhandledrejection` de forma silenciosa e resiliente.
   * Filtra erros gerados por extensÃµes do browser.
   * Agrupa e conta a frequÃªncia de erros repetidos antes de escalar para estado crÃ­tico.
2. **ResiliÃªncia e Retries (`useAppHealing.ts`):**
   * Classifica erros em 7 categorias principais (Rede, Auth, RLS/PermissÃµes, CÃ¢mara, Ãudio, Erros de UI e falhas tRPC).
   * Implementa `withAutoRetry` usando backoff exponencial e *jitter* (variaÃ§Ã£o aleatÃ³ria) para evitar avalanche de pedidos em APIs falhadas.
   * Deteta padrÃµes recorrentes: se um componente falha repetidamente (>3 vezes), escala o seu estado de saÃºde para `CRITICAL` e sugere resoluÃ§Ãµes inteligentes baseadas no histÃ³rico.
3. **Fronteiras de Erro Inteligentes (`ErrorBoundary.tsx`):**
   * IntegraÃ§Ã£o com o motor de autocura.
   * Tenta renderizar novamente (auto-retry) atÃ© 2 vezes de forma transparente.
   * Apresenta uma interface de utilizador polida em portuguÃªs, distinguindo falhas de carregamento de rede de crashes puros de lÃ³gica/render.
4. **PersistÃªncia Remota (Supabase):**
   * As tabelas `app_errors`, `app_healing_actions` e `app_health_state` registam todas as ocorrÃªncias e as aÃ§Ãµes automÃ¡ticas tomadas.
   * RLS ativado: utilizadores apenas veem os seus registos de erro; utilizadores administradores tÃªm acesso total.
   * Procedure agendada para limpar histÃ³rico com mais de 30 dias para otimizaÃ§Ã£o de espaÃ§o.

---

## ðŸ©º 2. Modo VeterinÃ¡rio âœ…

### O que foi feito:
* **Base de Dados:** Tabelas clÃ­nicas (`vet_pet_access`, `vet_shares`, `vet_notes`, `vet_alerts`) integradas no Supabase.
* **Funcionalidade E2E:** 
  1. **AtualizaÃ§Ã£o de Estado ClÃ­nico:** MudanÃ§a de estado de caso clÃ­nico de *Monitorizar* para *EstÃ¡vel* refletida em tempo real.
  2. **Notas ClÃ­nicas Internas:** Possibilidade de escrever notas visÃ­veis apenas para a equipa mÃ©dica.
* **ValidaÃ§Ã£o dos Dados:** Os dados foram verificados diretamente via Supabase (`scratch/check_vet_rows.js`), validando a gravaÃ§Ã£o de notas internas e status com sucesso.

---

## ðŸ‘¨â€ðŸ‘©â€ðŸ‘§â€ðŸ‘¦ 3. Modo FamÃ­lia â€” Funcionalidades & UX âœ…

* **RemoÃ§Ã£o de Membros:** Adicionado suporte para utilizadores abandonarem voluntariamente uma famÃ­lia (`family.leave` tRPC router).
* **Painel Inteligente:** Layout reestruturado para mostrar formulÃ¡rios de adesÃ£o e criaÃ§Ã£o apenas quando sem famÃ­lia; se jÃ¡ em famÃ­lia, renderiza instantaneamente o painel de gestÃ£o com badges de cargos em tempo real e transiÃ§Ãµes fluidas.

---

## ðŸŽ¨ 4. Landing Page â€” Melhorias EstÃ©ticas âœ…

* **Hero Visual:** Enriquecido com imagens dinÃ¢micas e grafismo moderno.
* **Tipografia e Grid:** UtilizaÃ§Ã£o de `text-wrap: balance` e otimizaÃ§Ã£o de grelha responsive para dispositivos mobile.

---

## 5. VerificaÃ§Ã£o TÃ©cnica Geral âœ…

### Suite de Testes UnitÃ¡rios:
* **102/102 testes a passar** com sucesso (Vitest).
* Cobertura unitÃ¡ria adicionada para as heurÃ­sticas de retries, classificaÃ§Ã£o e detecÃ§Ã£o de ciclos do motor de autocura.

### CompilaÃ§Ã£o:
* `pnpm run check` corre sem qualquer erro de tipos TypeScript (0% de erro).

---

## ðŸŽ¨ 6. UI/UX Global â€” Design System + Componentes Base (RecÃ©m-Ativado) âœ…

### O que foi feito:
1. **Design Tokens (`client/src/styles/design-tokens.css`):**
   * ConfiguraÃ§Ã£o de cores profundas em dark mode: `--color-bg: #0a0a0b`, `--color-surface: #111113`.
   * Cores de acento: verde (`#22c55e`), aviso/alerta (`#f59e0b`).
   * Tipografia profissional Satoshi importada via CDN.
   * EspaÃ§amento base de 4px e arredondamentos generosos para cartÃµes (`16px`) e pÃ­lulas (`9999px`).
   * Sombras escuras calibradas e transiÃ§Ãµes fluidas de `150ms` (cubic-bezier).

2. **Componentes base unificados:**
   * **Button:** Estilizado com acento verde para botÃµes primÃ¡rios, variantes ghost e destrutivas, todos com efeito de escala ao clicar.
   * **Card:** Fundo escuro com borda subtil semitransparente e glow verde suave ao passar o rato (hover).
   * **Badge:** Cores mapeadas para o estado de saÃºde (verde para saudÃ¡vel, Ã¢mbar para alerta, vermelho para crÃ­tico, azul para info).
   * **Avatar:** Placeholder de pata de animal estilizada em SVG inline.
   * **EmptyState:** IlustraÃ§Ã£o de pata a flutuar com animaÃ§Ã£o SVG e botÃ£o de Call-To-Action.
   * **Skeleton:** Efeito shimmer moderno para o carregamento em vez de piscar simples.

3. **LogÃ³tipo Corporativo SVG (`Logo.tsx`):**
   * Desenho inline com pata estilizada integrada com ondas de frequÃªncia Ã¡udio. Funciona em 24px e 200px.
   * Integrado no `Header.tsx` e `LandingPage.tsx` para substituiÃ§Ã£o dos emojis anteriores.

4. **NavegaÃ§Ã£o Responsiva (BottomNav & Sidebar):**
   * **BottomNav:** Barra inferior com 4 Ã­cones estÃ¡ticos para mobile (Dashboard, Gravar, Animais, Perfil) escondida em ecrÃ£s mÃ©dios/grandes.
   * **Sidebar:** Barra lateral colapsÃ¡vel para desktop com o logÃ³tipo oficial no topo, links centrais e painel com foto/iniciais e botÃ£o de logout no fundo.
   * Ambos integrados perfeitamente no layout global autenticado em `App.tsx`.

### VerificaÃ§Ã£o TÃ©cnica:
* **CompilaÃ§Ã£o:** Resolvido erro de tipo no avatar do utilizador no menu lateral e aviso de ordem de `@import` nos estilos globais. `pnpm run check` termina agora com sucesso total (0 erros de tipo).
* **Build de ProduÃ§Ã£o:** `pnpm run build` compila perfeitamente tanto o bundle do cliente quanto o do servidor.
* **Testes unitÃ¡rios:** Todos os 102 testes do Vitest continuam a passar com 100% de sucesso.

---

## ðŸ“± 7. Conetividade Android Capacitor & ConfiguraÃ§Ãµes de SeguranÃ§a âœ…

### O que foi feito:
* **Capacitor Configuration:** O arquivo [capacitor.config.ts](file:///D:/Pawra/capacitor.config.ts) foi configurado com `server.url` apontando para `https://Pawra.vercel.app` para que os assets e requisiÃ§Ãµes da web app carreguem a partir do servidor de produÃ§Ã£o no ambiente nativo.
* **Network Security Configuration:** Criamos o arquivo [network_security_config.xml](file:///D:/Pawra/android/app/src/main/res/xml/network_security_config.xml) habilitando trÃ¡fego claro (cleartext) e HTTPS de forma segura para os domÃ­nios `Pawra.vercel.app` e `yuzqxrmtbqlnalpjehno.supabase.co`.
* **Android Manifest:** Vinculamos a configuraÃ§Ã£o de seguranÃ§a em [AndroidManifest.xml](file:///D:/Pawra/android/app/src/main/AndroidManifest.xml) usando `android:networkSecurityConfig="@xml/network_security_config"` no `<application>` e validamos que a permissÃ£o `android.permission.INTERNET` estÃ¡ devidamente declarada.
* **ResoluÃ§Ã£o DinÃ¢mica de URL do tRPC:** Modificamos o arquivo [main.tsx](file:///D:/Pawra/client/src/main.tsx) utilizando a biblioteca core do Capacitor para detectar se o app estÃ¡ rodando de forma nativa (`Capacitor.isNativePlatform()`), resolvendo a URL do tRPC de forma absoluta (`https://Pawra.vercel.app/api/trpc`) apenas na app Android, mantendo o fallback relativo `/api/trpc` no navegador web convencional.

### VerificaÃ§Ã£o TÃ©cnica:
* **Commit do CÃ³digo:** Todas as alteraÃ§Ãµes foram adicionadas e salvas com a mensagem de commit correspondente.
* **Build local e Capacitor Sync:** O comando `pnpm run build && npx cap sync` foi executado com sucesso, sincronizando todos os assets gerados para a pasta nativa do projeto Android.
* **Gradle Build:** Compilamos a aplicaÃ§Ã£o Android localmente executando `.\gradlew.bat assembleDebug` de dentro da pasta `android`, gerando com sucesso o arquivo APK final em [app-debug.apk](file:///D:/Pawra/android/app/build/outputs/apk/debug/app-debug.apk) (tamanho aproximado de ~33.5 MB).
* **Suite de Testes UnitÃ¡rios:** Todos os **102 testes do Vitest** passam com 100% de sucesso.

---

## 8. DicionÃ¡rio de Alimentos (NutriÃ§Ã£o Segura) âœ…

### O que foi feito:
* **Base de Dados:** Criada a tabela `foods` com o ficheiro de migraÃ§Ã£o `20260608_food_dictionary.sql`, contendo restriÃ§Ãµes de severidade (`safe`, `caution`, `dangerous`, `toxic`), Row Level Security (RLS) protegendo gravaÃ§Ãµes por administrador, e populada com um seed de 30 alimentos em portuguÃªs e inglÃªs detalhados com sintomas clÃ­nicos e diretrizes mÃ©dicas reais.
* **Interface Web e Mobile:** Criada a pÃ¡gina [FoodSearchPage.tsx](file:///D:/Pawra/client/src/pages/FoodSearchPage.tsx) para consulta em tempo real:
  - O utilizador pode selecionar a espÃ©cie do seu animal (CÃ£o, Gato, Coelho, Ave) com auto-seleÃ§Ã£o inteligente baseada no perfil do animal ativo.
  - Caixa de pesquisa responsiva com sugestÃµes rÃ¡pidas e badges de cores dinÃ¢micas indicando o risco e o nÃ­vel de severidade clÃ­nica.
  - Alerta de emergÃªncia destacado ("O que fazer") para alimentos perigosos ou tÃ³xicos.
* **Backend tRPC:** Expostas as rotas `search`, `getById` e `getAll` na camada de dados (`foodsRouter` em `server/routers/foods.ts`), de livre acesso pÃºblico para garantir que utilizadores sem login efetuado possam usar o dicionÃ¡rio rapidamente.
* **NavegaÃ§Ã£o:** Rota registada globalmente e ligaÃ§Ãµes rÃ¡pidas integradas de forma elegante no menu lateral (desktop), na barra de navegaÃ§Ã£o inferior (mobile) e nas aÃ§Ãµes rÃ¡pidas da pÃ¡gina principal do utilizador (dashboard).
* **Testes e Tipos:** Desenvolvidos testes em `server/foods.test.ts` que validam o cÃ¡lculo de severidade por espÃ©cie, listagem e pesquisa de sinÃ³nimos. TypeScript compilado com sucesso total (0 erros) e todos os testes unitÃ¡rios passando.

---

## ðŸ›¡ï¸ 9. SeguranÃ§a dos Endpoints de SaÃºde & Classificador HeurÃ­stico Offline âœ…

### O que foi feito:
* **SeguranÃ§a do Health Router**: Refatoramos `server/routers/health.ts` para que todas as aÃ§Ãµes efetuem verificaÃ§Ã£o de permissÃµes do utilizador sobre o animal antes de consultar ou modificar dados (vacinas e registos de saÃºde). Criamos os mÃ©todos `getVaccineById` e `getHealthRecordById` em `server/db.ts` para resolver o `animalId` correspondente antes de validaÃ§Ãµes de escrita em pedidos de eliminaÃ§Ã£o.
* **Classificador HeurÃ­stico Offline**: Refatoramos `client/src/lib/localClassifier.ts` para implementar uma anÃ¡lise de Ã¡udio matemÃ¡tica baseada em recursos de amplitude (RMS) e taxa de cruzamento por zero (ZCR). Se a app estiver offline e o carregamento do modelo YAMNet a partir do TFHub CDN falhar devido a falta de ligaÃ§Ã£o Ã  internet, a app utiliza este motor de heurÃ­sticas local para inferir o estado do animal com base no Ã¡udio capturado (evitando gerar resultados puramente aleatÃ³rios).
* **Testes UnitÃ¡rios de SeguranÃ§a**: Criamos 14 testes unitÃ¡rios completos em `server/health.test.ts` que validam as permissÃµes em todos os endpoints de saÃºde para utilizadores autorizados e nÃ£o autorizados. Todos os testes estÃ£o a passar com 100% de sucesso.

---

## ðŸ“‹ 10. Registo de Sintomas (Symptom Logger) & ExportaÃ§Ã£o PDF âœ…

### O que foi feito:
* **PersistÃªncia de Dados**: O registo de sintomas foi integrado de forma limpa na tabela existente `health_records` usando `record_type = 'notes'` e `category = 'symptom'`. O campo `product` guarda o nome do sintoma (ex: "vomiting", "lethargy"), o campo `result` guarda o nÃ­vel de gravidade ("low", "medium", "high") e o campo `notes` armazena as observaÃ§Ãµes clÃ­nicas.
* **Componente de Interface (UI)**: Implementamos a secÃ§Ã£o collapsible **7. Registo de Sintomas (Symptom Logger)** no ecrÃ£ de saÃºde do animal (`HealthBulletinTab.tsx`):
  - Listagem em tempo real com badges coloridos de gravidade (Leve/Moderado/Grave ou Mild/Moderate/Severe) com base nas preferÃªncias de idioma do utilizador.
  - DiÃ¡logo de confirmaÃ§Ã£o para eliminaÃ§Ã£o de registos.
  - FormulÃ¡rio para adicionar sintomas comuns (VÃ³mitos, Letargia, Coceira, Perda de Apetite, Diarreia, Tosse, Febre) e opÃ§Ã£o "Outro" com campo de texto livre para sintomas personalizados.
* **ExportaÃ§Ã£o para PDF**: Atualizamos o componente gerador de PDF (`HealthBulletinPDF.tsx` e `HealthPage.tsx`) para incluir e formatar a tabela completa de sintomas registados, facilitando a partilha presencial ou digital com mÃ©dicos veterinÃ¡rios.
* **LocalizaÃ§Ã£o**: Suporte completo a traduÃ§Ãµes dinÃ¢micas em PortuguÃªs (`pt.json`) e InglÃªs (`en.json`).
* **Testes e Tipos**: Escrevemos testes unitÃ¡rios focados na validaÃ§Ã£o do fluxo e contratos de dados para sintomas em `server/health.test.ts`. Todos os 103 testes do Vitest estÃ£o a passar com 100% de sucesso.

---

## ðŸ 11. DicionÃ¡rio de Alimentos Otimizado & Filtragem por EspÃ©cie âœ…

### O que foi feito:
* **Filtros Simplificados**: Limitamos a seleÃ§Ã£o de espÃ©cies apenas a **CÃ£o** (dog) e **Gato** (cat) na pÃ¡gina [FoodSearchPage.tsx](file:///D:/Pawra/client/src/pages/FoodSearchPage.tsx), removendo as categorias secundÃ¡rias de Aves e Coelhos para simplificar a usabilidade.
* **DivisÃ£o Visual Clara**: Os resultados da pesquisa agora sÃ£o agrupados e mostrados em duas secÃ§Ãµes distintas com cores claras e design premium:
  - **Alimentos Seguros (Safe Foods)**: Card agrupador com margem e fundo verde suave (`emerald`).
  - **Alimentos Perigosos ou com AtenÃ§Ã£o (Dangerous or Caution Foods)**: Card agrupador com margem e fundo vermelho/rosa suave (`rose`).
* **LÃ³gica de Filtros**: Alimentos comuns a ambas as espÃ©cies aparecem em ambos os filtros; alimentos especÃ­ficos de apenas uma espÃ©cie aparecem apenas quando esta estÃ¡ selecionada.

---

## ðŸ• 12. GestÃ£o do Perfil do Animal nas DefiniÃ§Ãµes & Limpeza de NavegaÃ§Ã£o âœ…

### O que foi feito:
* **PersistÃªncia do Peso**: Criamos a migraÃ§Ã£o SQL [20260611_add_animal_weight.sql](file:///D:/Pawra/supabase-migrations/20260611_add_animal_weight.sql) para adicionar a coluna `weight VARCHAR(50)` na tabela `animals` no Supabase. Adicionamos suporte completo no backend (`db.ts`, mapeamento `mapDbAnimal`, e procedimentos de atualizaÃ§Ã£o/criaÃ§Ã£o) e esquemas Zod (`routers.ts`).
* **Painel Centralizado nas DefiniÃ§Ãµes**: Desenvolvemos uma secÃ§Ã£o dedicada **Os Meus Animais (My Pets)** na pÃ¡gina de [SettingsPage.tsx](file:///D:/Pawra/client/src/pages/SettingsPage.tsx):
  - **Carrossel de SeleÃ§Ã£o**: Permite escolher visualmente o animal ativo para ediÃ§Ã£o rÃ¡pida.
  - **CriaÃ§Ã£o de Novos Animais**: BotÃ£o "+ Adicionar" integrado com a Drawer deslizante reutilizando o `AddAnimalForm` de forma responsiva.
  - **EdiÃ§Ã£o Direta**: FormulÃ¡rio de alteraÃ§Ã£o de Nome, EspÃ©cie, RaÃ§a (com dropdown dinÃ¢mico e opÃ§Ã£o "Outra"), Idade, Peso (ex: "12 kg") e Foto (conversÃ£o local imediata para base64 com preview circular e botÃ£o de cÃ¢mara).
* **NavegaÃ§Ã£o Simplificada**:
  - Removemos os separadores redundantes de `/perfil` (Animais) e `/user-profile` (Perfil do Utilizador) do [BottomNav.tsx](file:///D:/Pawra/client/src/components/BottomNav.tsx) e do [Sidebar.tsx](file:///D:/Pawra/client/src/components/Sidebar.tsx).
  - Atualizamos as rotas em [App.tsx](file:///D:/Pawra/client/src/App.tsx) para que acessos diretos aos links `/perfil` e `/user-profile` redirecionem instantaneamente para `/definicoes` de forma limpa.
  - Atualizamos os botÃµes de voltar e redirecionamentos no dashboard e na pÃ¡gina de detalhes do animal para usar `/definicoes`.

---

## ðŸ› ï¸ 13. VerificaÃ§Ã£o TÃ©cnica Final âœ…

* **CompilaÃ§Ã£o TypeScript**: `pnpm run check` correu sem qualquer erro ou aviso (0 erros de tipos).
* **Testes UnitÃ¡rios**: Executamos a suite de testes locais e todos os **103 testes** passaram com sucesso.
* **Build de ProduÃ§Ã£o**: `pnpm run build` gerou com sucesso todos os assets estÃ¡ticos do frontend e o bundle de produÃ§Ã£o do servidor NodeJS sem falhas de compilaÃ§Ã£o ou lints.
* **PublicaÃ§Ã£o**: As alteraÃ§Ãµes foram commitadas e empurradas com sucesso para a branch principal (`git push origin main`).

---

## ðŸ” 14. Auditoria Visual UI/UX & ValidaÃ§Ã£o E2E (Fase de VerificaÃ§Ã£o Completa) âœ…

EfetuÃ¡mos uma auditoria completa de todas as pÃ¡ginas da aplicaÃ§Ã£o para validar a responsividade, alinhamentos, tamanhos de toque (mÃ­nimo 44x44px), acessibilidade e ausÃªncia de erros na consola do browser.

### Resultados da Auditoria:
* **Filtros e Layout do DicionÃ¡rio de Alimentos**: Confirmada a segmentaÃ§Ã£o visual clara entre *Alimentos Seguros* (verde emerald) e *Alimentos Perigosos* (vermelho/rosa rose) em ecrÃ£s mobile e desktop. A seleÃ§Ã£o de espÃ©cies limita-se corretamente a CÃ£o e Gato, com os alimentos comuns a aparecer em ambos os filtros e os exclusivos nos respetivos.
* **Perfil do Animal nas DefiniÃ§Ãµes**: Carrossel horizontal e formulÃ¡rio de ediÃ§Ã£o direta de peso (com a nova coluna persistida no Supabase), idade, raÃ§a e nome a funcionar sem anomalias estÃ©ticas.
* **NavegaÃ§Ã£o & Redirecionamentos**: ConfirmaÃ§Ã£o visual de que o separador `/perfil` foi inteiramente removido dos menus e que redireciona o utilizador com sucesso para `/definicoes`.
* **ResoluÃ§Ãµes e Responsividade**: ValidaÃ§Ã£o em viewports mobile (375x812) e desktop (1280x800).
* **Captura de EcrÃ£s**: Todos os screenshots antes e depois da auditoria foram capturados e guardados no diretÃ³rio de artifacts com os sufixos `_mobile` e `_desktop` para anÃ¡lise e persistÃªncia.

### ValidaÃ§Ã£o TÃ©cnica E2E:
* **Playwright E2E Tests**: ExecutÃ¡mos toda a suite de integraÃ§Ã£o (`pnpm run e2e`), com **6/6 testes a passar** com sucesso (auth-callback, desktop-warning, history, login, pdf-export e recording).
* **Vitest Unit Tests**: Todos os **103/103 testes** do backend e lÃ³gica local passam com sucesso.
* **TypeScript & Build**: `pnpm run check` (0 erros de tipo) e `pnpm run build` compilam a 100%.

---

## ðŸŒŸ 7. Melhorias da Ronda 2 (Round 2 Improvements) âœ…

Nesta atualizaÃ§Ã£o, foram implementadas melhorias de robustez, usabilidade e conformidade visual para a Ronda 2:

### 1. RestauraÃ§Ã£o e IntegraÃ§Ã£o da PÃ¡gina de Perfil (`/perfil`)
* A pÃ¡gina de perfil foi totalmente restaurada para a rota `/perfil` (mapeada para `ProfilePage.tsx`), eliminando o redirecionamento cego para as definiÃ§Ãµes.
* **Menus de NavegaÃ§Ã£o Atualizados**: Tanto a barra inferior mobile (`BottomNav.tsx`) como a barra lateral de desktop (`Sidebar.tsx`) foram atualizados para incluir e apontar para `/perfil` ("Animais") e para `/capturar` ("Capturar"), substituindo atalhos antigos.
* O clique no utilizador ou avatar no fundo da barra lateral desktop redireciona agora intuitivamente para a pÃ¡gina `/perfil` de forma amigÃ¡vel.

### 2. SeparaÃ§Ã£o de Fluxos de Captura: Gravador de Voz (`/gravar`) e CÃ¢mara (`/camera`)
* **Portal de Captura (`/capturar`)**: CriÃ¡mos um ecrÃ£ de entrada moderno e responsivo (`CapturePortalPage.tsx`) que permite ao utilizador selecionar de forma simples e intuitiva o modo de captura pretendido:
  - **Gravar Ãudio (`/gravar`)**: Para vocalizaÃ§Ãµes e anÃ¡lise acÃºstica.
  - **CÃ¢mara VisÃ£o (`/camera`)**: Para anÃ¡lise de postura e linguagem corporal com YOLOv8.
* **Separadores Independentes**: O gravador de Ã¡udio e a cÃ¢mara foram dissociados para ecrÃ£s e fluxos dedicados (`RecordingPage.tsx` e `CameraPage.tsx`), garantindo um design limpo e focado em cada funcionalidade nativa de hardware.

### 3. Novas OpÃ§Ãµes de CriaÃ§Ã£o de Perfil de Animal
Ao adicionar um animal, o utilizador dispÃµe agora de trÃªs mÃ©todos organizados em separadores dinÃ¢micos no formulÃ¡rio de criaÃ§Ã£o:
1. **Manual**: Preenchimento convencional de todos os campos.
2. **Microchip**: Permite a criaÃ§Ã£o simplificada e rÃ¡pida fornecendo apenas o Nome e o NÃºmero de Microchip (validado estritamente para 15 dÃ­gitos numÃ©ricos).
3. **Boletim (OCR)**: ImportaÃ§Ã£o simulada atravÃ©s do carregamento do boletim de vacinas, com estado de processamento realista e mensagens de orientaÃ§Ã£o.

### 4. Zonas de Carregamento de Media Padronizadas (Upload Zones)
ImplementÃ¡mos uma lÃ³gica visual unificada de carregamento para a foto do animal, boletim (OCR) e gravaÃ§Ã£o de Ã¡udio, com suporte para 5 estados bem definidos:
* **Inativo (Idle)**: Estado inicial com zona tracejada, instruÃ§Ã£o de formato/tamanho (mÃ¡x. 20 MB, JPG/PNG/PDF) e Ã­cone chamativo.
* **A enviar (Uploading)**: Mostra uma barra de progresso em tempo real (`Progress`) com a percentagem de progresso de upload simulada.
* **A processar/analisar (Processing)**: Renderiza um indicador de carregamento (`Loader2`) animado sinalizando a anÃ¡lise ou processamento de IA/OCR.
* **Sucesso (Success)**: Exibe a imagem carregada em tamanho pequeno (ou Ã­cone de documento no caso de PDF), nome do ficheiro e um badge verde de sucesso com opÃ§Ãµes para "Substituir" ou "Remover".
* **Erro (Error)**: Apresenta um aviso visual a vermelho com a respetiva mensagem de erro em portuguÃªs de Portugal. Tratamento inteligente de erros com mensagens especÃ­ficas e botÃ£o para "Tentar novamente":
  - Formato nÃ£o suportado: `"Formato nÃ£o suportado. Usa JPG, PNG ou PDF."`
  - Tamanho excedido: `"Ficheiro demasiado grande. MÃ¡ximo 20 MB."`
  - Falha de rede: `"LigaÃ§Ã£o interrompida. Tentar novamente."`
  - PermissÃ£o negada: Mostra botÃ£o para aceder Ã s "DefiniÃ§Ãµes" do browser.

Estes componentes e ecrÃ£s podem ser consultados diretamente nos ficheiros `client/src/pages/ProfilePage.tsx`, `client/src/pages/CapturePortalPage.tsx`, `client/src/pages/CameraPage.tsx` e `client/src/pages/RecordingPage.tsx`.

---

## ðŸŽ¨ 8. Ronda 3: RemoÃ§Ã£o Completa de Emojis & Polimento de Interface âœ…

Nesta fase final de polimento e consistÃªncia visual, removemos todos os emojis hardcoded que eram utilizados como placeholders, Ã­cones ou indicadores de estado, substituindo-os por elementos de design modernos e Ã­cones SVG/Lucide de alta fidelidade:

### 1. SubstituiÃ§Ã£o de Emojis por Componentes & Ãcones SVG
* **Indicadores de Estado (Dashboard e ComparaÃ§Ã£o)**: Os cÃ­rculos de cores que representam os estados emocionais (ðŸ”´, ðŸŸ¡, ðŸŸ¢, ðŸŸ , ðŸ”µ, âšª) foram eliminados. Em seu lugar, implementÃ¡mos cÃ­rculos estilizados nativos via CSS/SVG usando `STATE_COLORS`, garantindo um visual profissional, polido e consistente em todo o painel e tabelas.
* **Ãcones de EspÃ©cies e Interface**: Os emojis `ðŸ•` e `ðŸˆ` utilizados em carrossÃ©is, tabs de alimentos, avatares de fallback e modais foram substituÃ­dos pelo Ã­cone oficial `<PawPrint />`.
* **Outros Emojis da UI**:
  - Feedback de classificaÃ§Ã£o `ðŸ‘` / `ðŸ‘Ž` substituÃ­do por `<ThumbsUp />` e `<ThumbsDown />`.
  - Notas de eventos `ðŸ“` substituÃ­do pelo Ã­cone `<FileText />`.
  - Estados vazios `ðŸ”` / `ðŸŽ™ï¸` substituÃ­dos por `<Search />` e `<PawPrint />` animados.
  - Toasts e alertas foram limpos de caracteres emoji redundantes.

### 2. ResoluÃ§Ã£o de Erros JSX e CompilaÃ§Ã£o
* Corrigimos um erro de balanceamento de tags HTML/JSX no ficheiro [DashboardPage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/DashboardPage.tsx) nos cartÃµes de estado dominante e de crenÃ§a consolidada POMDP. Os elementos de texto foram colocados novamente dentro do wrapper `<div>` correspondente, resolvendo a quebra do parser do compilador TypeScript.

### 3. Suite de Testes & Build
* **TypeScript Check**: O comando `pnpm run check` conclui com **0 erros de compilaÃ§Ã£o**.
* **Vitest Unit Tests**: Todos os **103/103 testes** de lÃ³gica e base de dados passam com 100% de sucesso.
* **Production Build**: A compilaÃ§Ã£o final da aplicaÃ§Ã£o (`pnpm run build`) termina com sucesso tanto para os assets estÃ¡ticos do cliente como para o bundle de servidor.

### 4. Auditoria Visual & Capturas de EcrÃ£
* Corrigimos o script de auditoria [run_audit_screenshots.js](file:///C:/Users/Alexandre/Documents/Pawra/scratch/run_audit_screenshots.js) para simular com sucesso uma sessÃ£o autenticada do Supabase no `localStorage` do browser e para simular `window.matchMedia` bypassando o `MobileOnlyGate`.
* CapturÃ¡mos com sucesso novas imagens de ecrÃ£ para todas as rotas (Dashboard, HistÃ³rico, Alimentos, DefiniÃ§Ãµes, GravaÃ§Ã£o e Detalhe de Animal) sem qualquer emoji visÃ­vel, mostrando os novos componentes e Ã­cones de design premium.

---

## ðŸŽ¨ 9. Ronda 3.5: Polimento Visual e UnificaÃ§Ã£o de CabeÃ§alhos (Round 3.5 Polish) âœ…

Nesta ronda, focÃ¡mo-nos na unificaÃ§Ã£o do cabeÃ§alho da aplicaÃ§Ã£o, remoÃ§Ã£o de duplicados locais, diferenciaÃ§Ã£o visual no portal de captura, melhorias no menu de navegaÃ§Ã£o inferior para evitar scrolling horizontal a 390px, e eliminaÃ§Ã£o de texto decorativo nos fundos das pÃ¡ginas de detalhes.

### 1. EliminaÃ§Ã£o de Texto Decorativo "DOG" / "CAT"
* SubstituÃ­mos os textos decorativos em segundo plano nas pÃ¡ginas de detalhes de animais e de veterinÃ¡rio ([AnimalDetailPage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/AnimalDetailPage.tsx) e [VetPetDetailPage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/VetPetDetailPage.tsx)) por um Ã­cone de pata neutro estilizado e rodado `<PawPrint size={140} />` com opacidade ultra reduzida.

### 2. Redesenho da SecÃ§Ã£o "Sobre" em DefiniÃ§Ãµes (`SettingsPage.tsx`)
* RedesenhÃ¡mos por completo a secÃ§Ã£o de informaÃ§Ãµes institucionais, removendo emojis e introduzindo o logÃ³tipo oficial do projeto em SVG ([Logo.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/components/ui/Logo.tsx)).
* AdicionÃ¡mos uma grelha limpa com a versÃ£o (`v1.0.0 (offline-ready)`) e os modelos locais de IA (YAMNet, YOLOv8, ResNet), alÃ©m de dois botÃµes premium com bordas e preenchimento adequados ligando diretamente aos Termos e PolÃ­ticas de Privacidade em `/privacidade` (usando os Ã­cones `Shield` e `FileText`).

### 3. PadronizaÃ§Ã£o de CabeÃ§alhos Globais
* **NavegaÃ§Ã£o Sem Setas**: MapeÃ¡mos as 6 rotas principais (`/dashboard`, `/perfil`, `/capturar`, `/alimentos`, `/historico`, `/definicoes`) em [Header.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/components/Header.tsx) para ocultar automaticamente o botÃ£o/seta de voltar. As pÃ¡ginas secundÃ¡rias exibem a seta de voltar normalmente.
* **TÃ­tulos DinÃ¢micos**: O `Header` agora renderiza tÃ­tulos amigÃ¡veis localizados em portuguÃªs/inglÃªs para cada rota (ex: "Animais", "Capturar", "CÃ¢mara VisÃ£o") em vez do genÃ©rico "Pawra".
* **EliminaÃ§Ã£o de CabeÃ§alhos Locais Duplicados**: Removemos cabeÃ§alhos e botÃµes redundantes que estavam implementados localmente em [CameraPage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/CameraPage.tsx), [VetPage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/VetPage.tsx) e [VetDashboardPage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/VetDashboardPage.tsx).

### 4. OtimizaÃ§Ã£o do Portal de Captura (`/capturar`)
* **Layout AssimÃ©trico e Diferenciado**: RedesenhÃ¡mos a pÃ¡gina [CapturePortalPage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/CapturePortalPage.tsx):
  - O cartÃ£o de **Gravar Ãudio** Ã© agora um bloco vertical de destaque (`h-52`) com um botÃ£o CTA direto "Gravar agora".
  - O cartÃ£o de **CÃ¢mara VisÃ£o** Ã© um bloco horizontal secundÃ¡rio compacto (`h-32`) com o CTA direto "Analisar â†’".
* **Textos Curtos**: AssegurÃ¡mos que todas as descriÃ§Ãµes dos cartÃµes ocupam exatamente uma Ãºnica linha para manter o aspeto premium e focado.
* **RemoÃ§Ã£o de Elementos DesnecessÃ¡rios**: EliminÃ¡mos emojis nos botÃµes e o botÃ£o redundante "Voltar ao Dashboard", guiando o utilizador a navegar naturalmente pelos menus.

### 5. ReestruturaÃ§Ã£o do Menu de NavegaÃ§Ã£o Inferior (BottomNav)
* **Visual Consistente**: UnificÃ¡mos o `strokeWidth` dos Ã­cones no [BottomNav.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/components/BottomNav.tsx) para exatamente `2.0` em todos os estados.
* **OtimizaÃ§Ã£o Layout 390px (Mobile-First)**: Reescrevemos as classes de estilo em [index.css](file:///C:/Users/Alexandre/Documents/Pawra/client/src/index.css):
  - MudÃ¡mos o comportamento dos itens para `flex: 1 1 0%` sem largura mÃ­nima estrita, permitindo que caibam perfeitamente em ecrÃ£s estreitos como viewports de 390px sem causar scrolling horizontal na barra.
  - Removemos o destaque de fundo arredondado (highlight blocky) que aparecia na tab ativa, mantendo apenas a mudanÃ§a de cor do Ã­cone e da legenda.
  - AlinhÃ¡mos verticalmente todas as legendas Ã  base inferior (bottom baseline).
  - PosicionÃ¡mos o Ã­cone de GravaÃ§Ã£o central de forma absoluta (`position: absolute`, `left: 50%`, `transform: translateX(-50%)`), garantindo que o botÃ£o flutuante permaneÃ§a sempre perfeitamente centrado e estÃ¡vel.

### 6. VerificaÃ§Ã£o TÃ©cnica Completa
* **CompilaÃ§Ã£o TypeScript**: O comando `pnpm run check` conclui com 0 erros de compilaÃ§Ã£o.
* **Testes UnitÃ¡rios**: A suite completa de testes unitÃ¡rios (`pnpm test`) correu e passou com 100% de sucesso (**103/103 testes**).
* **Build de ProduÃ§Ã£o**: O comando `pnpm run build` gerou o bundle de produÃ§Ã£o estÃ¡tico e o do servidor com sucesso.
* **Registo de EcrÃ£s (Screenshots)**: Tiramos e atualizÃ¡mos novos screenshots demonstrando o aspeto final polido da aplicaÃ§Ã£o.



## ðŸ“¦ 10. Ronda 5: TWA, Play Store e Assets de LanÃ§amento (Round 5 TWA & Play Store) âœ…

Nesta ronda final, empacotÃ¡mos a aplicaÃ§Ã£o PWA do Pawra como uma Trusted Web Activity (TWA) oficial para Android, gerÃ¡mos o pacote de lanÃ§amento assinado de produÃ§Ã£o e estruturÃ¡mos a presenÃ§a de loja para a Google Play Store.

### 1. InicializaÃ§Ã£o e ConfiguraÃ§Ã£o do Projeto TWA
* **Estrutura**: CriÃ¡mos o diretÃ³rio dedicado `android/twa/` e inicializÃ¡mos o projeto utilizando o Bubblewrap:
  - `bubblewrap init --manifest https://Pawra.vercel.app/manifest.webmanifest`
* **ParÃ¢metros de Projeto**:
  - **Nome e Short Name**: `Pawra`
  - **Package ID / Application ID**: `com.Pawra.app`
  - **Host**: `Pawra.vercel.app`
  - **Start Path**: `/`
  - **Status Bar Color**: `#22C55E`
  - **Splash Screen Color**: `#0A0A0B`
  - **Ãcones**: Associados automaticamente a `/icons/icon-512x512.png` (com suporte para maskable adaptive icons).

### 2. CompilaÃ§Ã£o e Assinatura Digital do Pacote (.aab)
* **CompilaÃ§Ã£o Gradle**: CompilÃ¡mos o projeto atravÃ©s do Gradle Wrapper diretamente, especificando a versÃ£o JDK 17 instalada no Bubblewrap e apontando o `ANDROID_HOME` para o SDK local do Bubblewrap. O build gerou com sucesso o pacote nÃ£o assinado em `app/build/outputs/bundle/release/app-release.aab`.
* **Assinatura Digital**: AssinÃ¡mos o pacote de lanÃ§amento com o certificado de produÃ§Ã£o gerado anteriormente (`Pawra-release.jks`) com o alias `Pawra`, utilizando o utilitÃ¡rio `jarsigner`:
  - `jarsigner -keystore ..\Pawra-release.jks -storepass Pawrapwd app-release.aab Pawra`
* **Armazenamento de Builds**: CriÃ¡mos o diretÃ³rio `android/builds/` e copiÃ¡mos o pacote assinado final como `Pawra-v1.0.0.aab`.

### 3. Metadados e PresenÃ§a de Loja
* CriÃ¡mos o ficheiro de documentaÃ§Ã£o [play-store-assets.md](file:///C:/Users/Alexandre/Documents/Pawra/play-store-assets.md) na raiz do projeto com toda a informaÃ§Ã£o requerida para a publicaÃ§Ã£o em duas lÃ­nguas (PortuguÃªs de Portugal e InglÃªs dos EUA), respeitando os limites estritos de tamanho do Google Play Console e listando apenas as funcionalidades reais da aplicaÃ§Ã£o (Mindi AI, Classificador Offline, DicionÃ¡rio de Alimentos, Registo de Sintomas).

### 4. Passos Manuais de PublicaÃ§Ã£o (Guia do Programador)
Para lanÃ§ar a aplicaÃ§Ã£o na Google Play Store, o programador deve seguir as seguintes etapas:
1. **Registo na Google Play Console**: Criar uma conta de programador na Google Play Console.
2. **Criar Nova AplicaÃ§Ã£o**: Introduzir o nome `Pawra`, definir como AplicaÃ§Ã£o Gratuita (Free) e selecionar o idioma principal (PT-PT).
3. **Carregar o Pacote (.aab)**: No separador "VersÃµes de produÃ§Ã£o" ou "Testes fechados", carregar o ficheiro `android/builds/Pawra-v1.0.0.aab` assinado.
4. **Metadados e Imagens**: Preencher os campos de TÃ­tulo, DescriÃ§Ã£o Curta e Longa com os textos definidos em `play-store-assets.md`, e carregar o Ã­cone de 512x512px gerado na ronda anterior.
5. **Digital Asset Links**: Como a app Ã© uma TWA, a barra de navegaÃ§Ã£o do browser desaparecerÃ¡ assim que a relaÃ§Ã£o de confianÃ§a for ativada pelo Google Play. O ficheiro [assetlinks.json](file:///C:/Users/Alexandre/Documents/Pawra/client/public/.well-known/assetlinks.json) jÃ¡ estÃ¡ live em `https://Pawra.vercel.app/.well-known/assetlinks.json` contendo o fingerprint SHA-256 correto.
6. **Enviar para RevisÃ£o**: Concluir o questionÃ¡rio de classificaÃ§Ã£o de conteÃºdo (PEGI 3) e enviar a aplicaÃ§Ã£o para aprovaÃ§Ã£o final pela Google.

---

### 5. ValidaÃ§Ã£o e Qualidade TÃ©cnica
* **TypeScript compilation**: ExecutÃ¡mos `pnpm run check` garantindo **0 erros** de compilaÃ§Ã£o.
* **Unit tests**: ExecutÃ¡mos `pnpm test` com todos os **103/103 testes** a passar com sucesso.

---

## ðŸŽ¨ SecÃ§Ã£o 12 â€” Mood System & UI DinÃ¢mica (Round 7) âœ…

Nesta secÃ§Ã£o, implementÃ¡mos o Mood System dinÃ¢mico que reage ao estado emocional do animal ativo. A interface do Pawra agora adapta as suas cores, mensagens e animaÃ§Ãµes com base no humor do animal, mantendo um tom de confianÃ§a e calma (como um consultÃ³rio de veterinÃ¡rio), sem ser alarmista.

### 1. CriaÃ§Ã£o do MoodContext
* **LocalizaÃ§Ã£o**: [MoodContext.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/contexts/MoodContext.tsx)
* **Estados**: TrÃªs estados emocionais suportados: `calm` | `neutral` | `concerned`.
* **Mapeamento de EmoÃ§Ãµes**:
  - `relaxed`, `excitement` âž” `calm` (tons verdes/teal suaves, animaÃ§Ãµes lentas)
  - `attention`, `alert` âž” `neutral` (tons azuis/cinza neutros, animaÃ§Ãµes normais)
  - `distress`, `hunger` âž” `concerned` (tons Ã¢mbar/laranja quentes, animaÃ§Ãµes ativas)
* **PersistÃªncia & Fallback**:
  - O mood Ã© calculado sempre que hÃ¡ uma nova classificaÃ§Ã£o.
  - Se a Ãºltima classificaÃ§Ã£o ocorreu hÃ¡ mais de **48 horas**, o humor reverte automaticamente para `neutral`.
  - O Ãºltimo humor Ã© guardado no `localStorage` e aplicado de forma sÃ­ncrona na inicializaÃ§Ã£o no `document.documentElement` para evitar cintilaÃ§Ã£o (flash) ao carregar.

### 2. AdaptaÃ§Ã£o DinÃ¢mica da UI (Dashboard)
* **Cores**: DefiniÃ§Ã£o de variÃ¡veis CSS HSL (`--mood-primary`, `--mood-bg-subtle`, `--mood-color-rgb`) para light e dark modes em [index.css](file:///C:/Users/Alexandre/Documents/Pawra/client/src/index.css), registadas como `--color-mood-primary` e `--color-mood-bg` no Tailwind CSS.
* **Mensagens Contextuais**:
  - `calm` âž” `"O [Nome] estÃ¡ bem hoje ðŸ¾"` (onde [Nome] Ã© substituÃ­do pelo nome do animal ativo, ex: "O Rex estÃ¡ bem hoje ðŸ¾")
  - `neutral` âž” `"Sem novidades com o [Nome]"` (ex: "Sem novidades com o Rex")
  - `concerned` âž” `"O [Nome] pode precisar de atenÃ§Ã£o â€” vÃª os detalhes"` (ex: "O Rex pode precisar de atenÃ§Ã£o â€” vÃª os detalhes")
* **AnimaÃ§Ãµes (Framer Motion)**:
  - **Pulsar do Avatar**: O avatar do animal ativo no cabeÃ§alho do dashboard e na lista de animais pulsa suavemente com escalas e sombras (box-shadow glow) que variam de velocidade consoante o humor: 3.0s para `calm`, 2.0s para `neutral` e 1.2s para `concerned`.
  - **Cards de EstatÃ­sticas & SecÃ§Ãµes**: Entram com uma animaÃ§Ã£o combinada de fade-in e slide-up progressiva e escalonada (staggered) usando variantes do Framer Motion ao abrir a pÃ¡gina do Dashboard.
  - **TransiÃ§Ãµes de PÃ¡gina**: Aplicado um crossfade suave de 200ms na transiÃ§Ã£o entre rotas no [App.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/App.tsx).
  - **BotÃ£o de GravaÃ§Ã£o**: MantÃ©m a animaÃ§Ã£o de respiraÃ§Ã£o (breathing animation) ativada durante a captaÃ§Ã£o de Ã¡udio atravÃ©s do `GlowingButton`.

---

## ðŸŽ¨ SecÃ§Ã£o 13 â€” Auditoria Completa de UI & UX (Round 8) âœ…

RealizÃ¡mos uma auditoria completa a todos os ecrÃ£s e botÃµes da aplicaÃ§Ã£o para maximizar a consistÃªncia, usabilidade e responsividade em ecrÃ£s estreitos de dispositivos mÃ³veis (375px), eliminando redundÃ¢ncias e uniformizando comportamentos de navegaÃ§Ã£o.

### O que foi corrigido:
1. **Gravar de Novo (`RecordingPage.tsx`)**: O botÃ£o de "Gravar de novo" no painel de revisÃ£o de gravaÃ§Ã£o de Ã¡udio estava incorretamente configurado para chamar o handler `handleDelete` (que simplesmente regressava ao estado inicial sem comeÃ§ar a gravar). AtualizÃ¡mos o botÃ£o para chamar `handleRetry`, iniciando o ciclo de gravaÃ§Ã£o imediatamente.
2. **NavegaÃ§Ã£o de Voltar do Header (`Header.tsx`)**: AtualizÃ¡mos a navegaÃ§Ã£o do botÃ£o de voltar para redirecionar explicitamente para o portal `/capturar` quando o utilizador se encontra no gravador de Ã¡udio (`/gravar`) ou na cÃ¢mara (`/camera`), evitando retrocessos inesperados na pilha de histÃ³rico do browser.
3. **ConsolidaÃ§Ã£o de Termos e Privacidade (`SettingsPage.tsx`)**: A secÃ§Ã£o de "Documentos e PolÃ­ticas" continha dois botÃµes separados ("Privacidade" e "Termos de Uso") que redirecionavam para o mesmo destino (`/privacidade`). ConsolidÃ¡mos ambos num Ãºnico botÃ£o elegante "Termos e Privacidade" de largura completa.
4. **ResoluÃ§Ã£o de Emojis em jsPDF (`AnimalDetailPage.tsx`)**: Removemos os caracteres de emoji (`ðŸ¾`, `ðŸ•`, `ðŸˆ`) das strings do gerador de PDF jsPDF, uma vez que fontes Helvetica padrÃ£o nÃ£o os suportam e causavam caixas pretas ou falhas visuais nos relatÃ³rios clÃ­nicos exportados.
5. **Polimento de Emojis Restantes**:
   - **`DashboardPage.tsx`**: SubstituiÃ§Ã£o do emoji de boas-vindas `âœ¨` pelo Ã­cone `<Sparkles />` oficial da Lucide e remoÃ§Ã£o do emoji `ðŸ¾` do banner de estado diÃ¡rio do animal.
   - **`CameraPage.tsx`**: RemoÃ§Ã£o do emoji `ðŸ“·` do botÃ£o de ativaÃ§Ã£o da cÃ¢mara e substituiÃ§Ã£o do emoji de classificaÃ§Ã£o na Badge de sucesso por um cÃ­rculo dinÃ¢mico colorido estilizado nativo com base na cor de estado `STATE_COLORS` e traduÃ§Ã£o apropriada da emoÃ§Ã£o.
   - **`RecordingPage.tsx`**: SubstituiÃ§Ã£o do emoji no indicador do histÃ³rico da Ãºltima classificaÃ§Ã£o contÃ­nua por um cÃ­rculo de estado de cor nativo.
   - **`HealthBulletinTab.tsx`**: SubstituiÃ§Ã£o do emoji `âš ï¸` na barra antirrÃ¡bica DGAV por um Ã­cone `<AlertCircle />` Lucide.
   - **`TrendCard.tsx`**: SubstituiÃ§Ã£o do emoji de padrÃ£o `âœ¨` pelo Ã­cone `<Sparkles />` Lucide.
   - **`ProfilePage.tsx`**: SimplificaÃ§Ã£o dos botÃµes de seleÃ§Ã£o de sexo (Masculino, Feminino, Desconhecido) para texto simples localizado (removendo `â™‚ï¸`, `â™€ï¸` e `â“`) e eliminaÃ§Ã£o do caractere de checkmark `âœ“` redundante que aparecia colado ao Ã­cone `<Check />` da validaÃ§Ã£o de nomes.

### O que foi removido e porquÃª:
* **BotÃ£o "Termos de Uso" individual (`SettingsPage.tsx`)**: Removido para evitar um link redundante com o mesmo destino que "Privacidade", uma vez que ambos apontavam para a mesma pÃ¡gina `/privacidade`.
* **CÃ¢mara Emoji e Pata Decorativa**: Removidos elementos emoji redundantes da interface do utilizador, alinhando a aplicaÃ§Ã£o com as decisÃµes tomadas em rondas anteriores de abolir emojis literais a favor de SVG/Lucide de alta fidelidade e design premium.

### VerificaÃ§Ã£o TÃ©cnica:
* **TypeScript Check**: `pnpm run check` correu sem qualquer erro.
* **Testes UnitÃ¡rios**: Suite de testes com 103/103 testes verdes.
* **Build de ProduÃ§Ã£o**: `pnpm run build` compilou perfeitamente.

---

## ðŸ› ï¸ SecÃ§Ã£o 14 â€” MigraÃ§Ã£o para Biome âœ…

RealizÃ¡mos a migraÃ§Ã£o completa do ecossistema de qualidade de cÃ³digo do Pawra de ESLint + Prettier para o Biome, unificando as tarefas de linting, formataÃ§Ã£o e ordenaÃ§Ã£o automÃ¡tica de imports numa Ãºnica ferramenta de alto desempenho.

### O que foi feito:
1. **InstalaÃ§Ã£o e InicializaÃ§Ã£o**:
   * InstalÃ¡mos a dependÃªncia `@biomejs/biome` (versÃ£o 2.5.0) e inicializÃ¡mos a configuraÃ§Ã£o com `pnpm biome init`.
2. **ConfiguraÃ§Ã£o Customizada (`biome.json`)**:
   * ConfiguraÃ§Ã£o de formataÃ§Ã£o idÃªntica ao Prettier anterior (indentaÃ§Ã£o por espaÃ§os de tamanho 2, largura mÃ¡xima de linha de 80, aspas duplas e ponto e vÃ­rgula obrigatÃ³rio).
   * AtivaÃ§Ã£o das regras recomendadas do linter e suporte para hooks do React (`useHookAtTopLevel` e `useExhaustiveDependencies`).
   * ConfiguraÃ§Ã£o de ignores de diretÃ³rios usando a sintaxe de exclusÃ£o de forÃ§a `!!` do Biome 2.5.0, excluindo pastas como `node_modules`, `dist`, `build`, `.gemini`, `client/public/__manus__` e `client/src/components/ui` (componentes do shadcn/ui).
   * AtivaÃ§Ã£o da ordenaÃ§Ã£o automÃ¡tica de imports sob a secÃ§Ã£o `assist.actions.source.organizeImports`.
3. **ResoluÃ§Ã£o de Conflitos e CorreÃ§Ãµes no CÃ³digo**:
   * ExecutÃ¡mos `pnpm biome check --write --unsafe .` para formatar todo o projeto e aplicar correÃ§Ãµes automÃ¡ticas seguras de qualidade.
   * **`HistoryPage.tsx`**: O componente `_EventRow` foi renomeado para `EventRow` (removendo o underscore inicial). Isto permitiu que o Biome o identificasse corretamente como um componente React em vez de uma funÃ§Ã£o comum, eliminando 8 falsos positivos da regra `useHookAtTopLevel` (uso de hooks fora de componentes).
   * **Vitest e React Scope (`ConfidenceRing.tsx`, `LiveAudioMeter.tsx` e respetivos testes)**: Como o Vitest executa no Node sem o runtime JSX automÃ¡tico ativado por defeito na configuraÃ§Ã£o, a remoÃ§Ã£o automÃ¡tica do import do React originava erros `ReferenceError: React is not defined` ao correr os testes unitÃ¡rios de componentes UI. Reintroduzimos o import explÃ­cito do React com o comentÃ¡rio `// biome-ignore lint/correctness/noUnusedImports: React is needed for JSX in Vitest` para manter a integridade dos testes.
4. **RemoÃ§Ã£o de Tooling Antigo**:
   * Removemos a dependÃªncia do `prettier` do `package.json`. Como o projeto nÃ£o continha dependÃªncias diretas de `eslint` declaradas, nenhuma outra remoÃ§Ã£o de pacotes foi necessÃ¡ria.
5. **AtualizaÃ§Ã£o de Scripts (`package.json`)**:
   * SubstituÃ­mos a formataÃ§Ã£o antiga do Prettier pelos comandos do Biome:
     * `"lint": "biome check ."`
     * `"lint:fix": "biome check --write ."`
     * `"format": "biome format --write ."`
6. **IntegraÃ§Ã£o no CI/CD (`.github/workflows/ci.yml`)**:
   * AdicionÃ¡mos um step de validaÃ§Ã£o de cÃ³digo no fluxo de integraÃ§Ã£o contÃ­nua antes do build:
     ```yaml
     - name: Lint & Format check
       run: pnpm biome ci .
     ```

### VerificaÃ§Ã£o TÃ©cnica Final:
* **Biome CI**: O comando `pnpm biome ci .` foi executado e concluiu com 100% de sucesso (zero erros).
* **Testes UnitÃ¡rios**: Todos os 103 testes da aplicaÃ§Ã£o estÃ£o verdes.
* **Build**: O build de produÃ§Ã£o (`pnpm run build`) compilou perfeitamente e gerou as pastas de distribuiÃ§Ã£o client/server sem avisos.

---

## ðŸŽ¨ SecÃ§Ã£o 15 â€” Autocomplete de RaÃ§as + ValidaÃ§Ã£o SIAC (Round 12) âœ…

Nesta secÃ§Ã£o, implementÃ¡mos o autocomplete de raÃ§as inteligente que consome as APIs pÃºblicas Dog API e Cat API, e adicionÃ¡mos a validaÃ§Ã£o de microchips no padrÃ£o portuguÃªs SIAC.

### 1. Autocomplete de RaÃ§as com Dog/Cat API
* **Componente Inteligente**: CriÃ¡mos o componente `BreedAutocomplete` ([ProfilePage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/ProfilePage.tsx#L370-L485)) que substitui o seletor antigo:
  - Consome dinamicamente a Dog API (`https://api.thedogapi.com/v1/breeds/search?q=[termo]`) ou Cat API (`https://api.thecatapi.com/v1/breeds/search?q=[termo]`) consoante a espÃ©cie.
  - Se a espÃ©cie for indefinida ou nÃ£o selecionada, pesquisa em ambas as APIs e junta os resultados.
  - Filtra e mostra no mÃ¡ximo 6 resultados num menu dropdown flutuante estilizado.
  - Implementa um debounce de **300ms** para controlar o volume de requisiÃ§Ãµes.
  - Trata o tempo de resposta atravÃ©s de um timeout de **3 segundos** com `AbortController` (se a API falhar ou demorar muito tempo, o campo funciona como input de texto normal - Graceful Fallback).
* **Limpeza de Estados**: Removemos as variÃ¡veis obsoletas de carregamento prÃ©vio de raÃ§as e os seus respetivos `useEffect` e `localStorage` de `AddAnimalForm` e `EditAnimalForm`.

### 2. ValidaÃ§Ã£o SIAC (Microchip com 15 dÃ­gitos)
* **ValidaÃ§Ã£o em Tempo Real**: AdicionÃ¡mos a validaÃ§Ã£o de formato/tamanho para nÃºmeros de microchip nos formulÃ¡rios de criaÃ§Ã£o (`AddAnimalForm`) e ediÃ§Ã£o (`EditAnimalForm`):
  - Verifica se o nÃºmero contÃ©m exatamente 15 dÃ­gitos numÃ©ricos.
  - Se for digitado um valor invÃ¡lido, o botÃ£o "Guardar" fica desativado e exibe-se a mensagem `"O nÃºmero de microchip deve ter exatamente 15 dÃ­gitos"`.
  - O campo de microchip na aba manual (ou ediÃ§Ã£o) continua opcional, mas se for preenchido, Ã© obrigatoriamente validado. Na aba microchip, a validaÃ§Ã£o Ã© estrita e obrigatÃ³ria.

### 3. VerificaÃ§Ã£o TÃ©cnica
* **TypeScript & Biome Check**: ConcluÃ­do com 0 erros e 0 avisos em `ProfilePage.tsx`.
* **Testes UnitÃ¡rios**: Suite de testes completa com todos os **103/103 testes** a passar com sucesso.
* **Build de ProduÃ§Ã£o**: O comando `pnpm run build` gerou o bundle de produÃ§Ã£o estÃ¡tico e do servidor sem qualquer problema.

## âš–ï¸ SecÃ§Ã£o 16 â€” Conformidade Legal RGPD (Round 13) âœ…

Nesta ronda, implementÃ¡mos um conjunto completo de medidas de conformidade com o Regulamento Geral sobre a ProteÃ§Ã£o de Dados (RGPD), incluindo uma nova pÃ¡gina de PolÃ­tica de Privacidade, links e modais de consentimento nos ecrÃ£s de registo e definiÃ§Ãµes, e a funcionalidade de apagamento permanente de conta (com cascade delete no Supabase e remoÃ§Ã£o de Ã¡udios no Storage).

### 1. PÃ¡gina de PolÃ­tica de Privacidade PÃºblica (/privacidade)
* **Componente**: CriÃ¡mos o ficheiro [PrivacyPolicyPage.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/pages/PrivacyPolicyPage.tsx) contendo as secÃ§Ãµes exigidas pelo RGPD (portuguÃªs):
  - **IdentificaÃ§Ã£o da App & ResponsÃ¡veis**: Pawra e placeholders para o tutor preencher.
  - **Dados Recolhidos**: Nome, email, dados do animal, Ã¡udios, cÃ¢mara e localizaÃ§Ã£o.
  - **Finalidades e Bases JurÃ­dicas**: PrestaÃ§Ã£o de serviÃ§o de traduÃ§Ã£o emocional de vocalizaÃ§Ãµes baseada no consentimento explÃ­cito do utilizador (Artigo 6.Âº, n.Âº 1, alÃ­nea a) do RGPD).
  - **Alojamento e SeguranÃ§a**: Dados guardados na regiÃ£o da UE (Frankfurt) atravÃ©s do Supabase com cifragem AES-256 em repouso e Row Level Security (RLS) ativo.
  - **Direitos do Tutor**: Acesso, retificaÃ§Ã£o, eliminaÃ§Ã£o ("direito ao esquecimento"), portabilidade e oposiÃ§Ã£o.
  - **RetenÃ§Ã£o de Dados**: EliminaÃ§Ã£o imediata dos servidores apÃ³s o apagamento da conta e remoÃ§Ã£o dos registos de autenticaÃ§Ã£o em 30 dias.
* **Design**: Consistente com o tema dark e estÃ©tica premium da app, com secÃ§Ãµes colapsÃ¡veis (`Accordion`) e rodapÃ© com link de contacto. A rota foi adicionada publicamente em [App.tsx](file:///C:/Users/Alexandre/Documents/Pawra/client/src/App.tsx) de forma a nÃ£o exigir autenticaÃ§Ã£o prÃ©via.

### 2. Consentimento e PolÃ­ticas no Registo e DefiniÃ§Ãµes
* **EcrÃ£ de Registo (`RegisterPage.tsx`)**: AdicionÃ¡mos o texto explicativo abaixo do botÃ£o de submissÃ£o do formulÃ¡rio: *"Ao criar conta, aceitas os nossos Termos de Uso e a nossa PolÃ­tica de Privacidade."*
  - O link de PolÃ­tica de Privacidade redireciona para `/privacidade`.
  - O link de Termos de Uso abre um modal dialog moderno com a indicaÃ§Ã£o *"Termos de Uso â€” Em breve"*.
* **DefiniÃ§Ãµes (`SettingsPage.tsx`)**:
  - Dividimos o botÃ£o anterior "Termos e Privacidade" em dois botÃµes autÃ³nomos: um para consultar a "PolÃ­tica de Privacidade" e outro que abre o modal informativo "Termos de Uso â€” Em breve".

### 3. Apagamento Permanente de Conta ("Zona de Perigo")
* **BotÃ£o "Apagar Conta" (`SettingsPage.tsx`)**: AdicionÃ¡mos uma nova secÃ§Ã£o visualmente sinalizada de "Zona de Perigo" (Danger Zone) com um botÃ£o vermelho que despoleta uma caixa de diÃ¡logo de confirmaÃ§Ã£o.
* **Endpoint de EliminaÃ§Ã£o (`routers.ts`)**: ImplementÃ¡mos a mutation `deleteAccount` dentro do router `auth` que corre do lado do servidor:
  - Consulta e remove permanentemente todos os ficheiros de Ã¡udio do utilizador armazenados no bucket `audio-recordings` do Supabase Storage.
  - Invoca o endpoint administrativo do Supabase Auth (`supabase.auth.admin.deleteUser`) para remover o registo de autenticaÃ§Ã£o do utilizador.
  - Elimina a linha do utilizador na tabela `public.users`, o que ativa automaticamente o apagamento em cascata (`ON DELETE CASCADE`) de todos os registos do utilizador e dos seus animais em todas as tabelas pÃºblicas do PostgreSQL no Supabase.
  - Limpa os cookies de sessÃ£o de login no response e redireciona o cliente para o ecrÃ£ `/login` exibindo um toast informativo.

### 4. VerificaÃ§Ã£o TÃ©cnica
* **TypeScript & Biome Check**: TypeScript compilado com sucesso e lint do Biome executado sem erros.
* **Testes UnitÃ¡rios**: CriÃ¡mos um novo teste em [auth.deleteAccount.test.ts](file:///C:/Users/Alexandre/Documents/Pawra/server/auth.deleteAccount.test.ts) que valida todo o fluxo de eliminaÃ§Ã£o da conta (remoÃ§Ã£o de Ã¡udios, chamada ao Auth Admin do Supabase, remoÃ§Ã£o de BD e remoÃ§Ã£o de cookies). A suite completa correu e passou com sucesso (**104/104 testes**).

---

## ðŸŒŸ Ronda 14b: Rebranding para Pawra & Novo Ãcone Profissional âœ…

### 1. Novo Nome do Projeto
* **Pawra** foi o nome selecionado por representar idealmente a monitorizaÃ§Ã£o acÃºstica e visual de animais de estimaÃ§Ã£o, mantendo-se premium, fÃ¡cil de pronunciar em PortuguÃªs e InglÃªs, e muito focado no valor do produto.

### 2. ConfiguraÃ§Ãµes de Rebranding
* **package.json:** Nome atualizado para `"pawra"` com uma nova descriÃ§Ã£o descritiva.
* **capacitor.config.ts:** Alterado `appName` para `"Pawra"`.
* **strings.xml (Android):** Atualizado `app_name` e `title_activity_main` para `"Pawra"`.
* **client/index.html:** Atualizado o tÃ­tulo principal para `"Pawra ðŸ¾ - Compreenda o Seu Animal de EstimaÃ§Ã£o"`, atualizadas as meta tags de Open Graph/Twitter, definido o `theme-color` como `#22c55e` (verde do tema) e adicionado o link para o Ã­cone favicon `icon.svg`.
* **vite.config.ts (PWA Manifest):** Atualizadas as configuraÃ§Ãµes do manifest do PWA (`name` e `short_name` para `"Pawra"`, descriÃ§Ã£o para *"Pawra: MonitorizaÃ§Ã£o inteligente do bem-estar animal"* e o `theme_color` ajustado).

### 3. LogÃ³tipos e Ãcones Profissionais SVG
* **client/public/icon.svg:** Ãcone completo com cantos arredondados, fundo gradiente e a pata central estilizada com ondas sonoras.
* **client/public/icon-foreground.svg:** Apenas a pata central com fundo transparente, otimizada para Ã­cones adaptativos do Android.
* **client/public/icon-background.svg:** Apenas o fundo com gradiente radial completo para Ã­cones adaptativos.
* **docs/icon-export.md:** Manual detalhado ensinando o programador a exportar os ficheiros SVG para o formato de loja PNG 512x512px.

### 4. Rebranding na Interface do Utilizador (UI) e Docs
* Alteradas todas as menÃ§Ãµes de marca de "AnimalMind" para "Pawra" nos ecrÃ£s de **Landing Page**, **AutenticaÃ§Ã£o (Login, Registo, RecuperaÃ§Ã£o, VerificaÃ§Ã£o de Email, Callback)**, **Dashboard**, **HistÃ³rico**, **GravaÃ§Ã£o/Captura**, **CÃ¢mara**, **PÃ¡ginas de Privacidade** e **DefiniÃ§Ãµes**.
* Atualizado o domÃ­nio principal nas configuraÃ§Ãµes internas de CORS da API e URL padrÃ£o do Capacitor para `pawra.vercel.app` (mantendo retrocompatibilidade no backend).
* Atualizada toda a documentaÃ§Ã£o de suporte do projeto: `README.md`, `walkthrough.md`, `docs/API.md` e `docs/backlog.md`.

### 5. VerificaÃ§Ã£o TÃ©cnica Total
* **CompilaÃ§Ã£o TypeScript:** `pnpm run check` correu sem qualquer erro (0 erros).
* **Testes UnitÃ¡rios:** Todos os **104 testes unitÃ¡rios** do Vitest passaram com sucesso.
* **Build de ProduÃ§Ã£o:** O comando `pnpm run build` gerou a build final sem falhas.
* **Git:** Commits registados com sucesso e alteraÃ§Ãµes enviadas para a branch `main`.

---

## ðŸŒŸ Ronda 14c: Rebranding de PetSense para Pawra (CorreÃ§Ã£o Urgente) âœ…

### 1. Novo Nome Ãšnico e DisponÃ­vel
* O nome anterior ("PetSense") foi alterado para **Pawra** por questÃµes de registo e disponibilidade nas lojas de aplicaÃ§Ãµes (Google Play e App Store).

### 2. ConfiguraÃ§Ãµes de Rebranding
* **package.json:** Nome atualizado para `"pawra"` com uma nova descriÃ§Ã£o correspondente.
* **capacitor.config.ts:** Alterado `appId` para `"com.pawra.app"` e `appName` to `"Pawra"`.
* **strings.xml (Android):** Atualizado `app_name` e `title_activity_main` para `"Pawra"`, alÃ©m das propriedades de pacote e esquema URL para `"com.pawra.app"`.
* **client/index.html:** Atualizado o tÃ­tulo principal para exatamente `"Pawra"`.
* **vite.config.ts (PWA Manifest):** Atualizadas as configuraÃ§Ãµes do manifest do PWA (`name` e `short_name` para `"Pawra"`, descriÃ§Ã£o para *"Pawra: MonitorizaÃ§Ã£o inteligente do bem-estar animal"*).

### 3. Rebranding na Interface do Utilizador (UI) e Docs
* Efetuada substituiÃ§Ã£o em massa de todas as ocorrÃªncias de `"PetSense"` e `"petsense"` para `"Pawra"` e `"pawra"` respetivamente nos ficheiros de ecrÃ£s, componentes, hooks, APIs e documentaÃ§Ã£o.

### 4. VerificaÃ§Ã£o TÃ©cnica Total
* **CompilaÃ§Ã£o TypeScript:** `pnpm run check` correu com **0 erros**.
* **Testes UnitÃ¡rios:** Todos os **104 testes unitÃ¡rios** do Vitest passaram com sucesso.
* **Build de ProduÃ§Ã£o:** O comando `pnpm run build` gerou a build final sem falhas.
* **Git:** Commits registados com sucesso e alteraÃ§Ãµes enviadas para a branch `main`.

---

## ðŸ¤– 15. Novo Pipeline de ML: ClassificaÃ§Ã£o de Imagens e Ferramentas de AnotaÃ§Ã£o (Ronda 15) âœ…

ImplementÃ¡mos e integramos com sucesso os trÃªs componentes previstos para o pipeline e backend de Machine Learning da aplicaÃ§Ã£o Pawra.

### 1. OpÃ§Ã£o 1: Fine-tuning de Classificador de EspÃ©cie/RaÃ§a (ViT)
* **Script de Treino (`data/scripts/train_species_classifier.py`)**:
  * Desenvolvemos um script completo de fine-tuning usando a API `transformers.Trainer` do Hugging Face.
  * O modelo base Ã© um ViT (`google/vit-base-patch16-224`) com uma arquitetura de duas cabeÃ§as de classificaÃ§Ã£o lineares (`head_species` para 2 classes, `head_breed` para 37 classes).
  * Suporta execuÃ§Ã£o em CPU/GPU, modo "linear probe" (congelando o backbone ViT para treino rÃ¡pido) e push direto do modelo treinado para o Hugging Face Hub (`--push-to-hub`).
  * Trata automaticamente a conversÃ£o de datasets no formato do Oxford-IIIT Pet.
* **SeguranÃ§a no Controlo de VersÃµes**:
  * AdicionÃ¡mos `ml_backend/models/` ao `.gitignore` para garantir que ficheiros de pesos grandes (como `pytorch_model.bin` de 330MB) nÃ£o sejam rastreados pelo Git, mantendo o histÃ³rico limpo.

### 2. OpÃ§Ã£o 2: Ferramentas de AnotaÃ§Ã£o Manual e AutomÃ¡tica
* **Anotador Manual CLI (`data/scripts/annotate_batch.py`)**:
  * Script interativo que permite ao utilizador carregar imagens de uma pasta local e anotÃ¡-las manualmente indicando o comportamento (`behavior`) e emoÃ§Ã£o (`emotion`).
  * Guarda os resultados no formato JSONL (`data/annotations/batch_XXX.jsonl`) com suporte a continuar o progresso de onde parou.
* **Auto-Anotador VLM (`data/scripts/auto_annotate.py`)**:
  * Ferramenta de anotaÃ§Ã£o automÃ¡tica que consome a API do Gemini (`gemini-2.5-flash`) para inferir comportamento, emoÃ§Ã£o, ambiente, qualidade da imagem e confianÃ§a do rÃ³tulo, gerando metadados ricos estruturados para cada imagem.

### 3. OpÃ§Ã£o 3: API do Servidor `/classify-image` (FastAPI)
* **Endpoint (`POST /classify-image`)**:
  * Adicionado ao servidor FastAPI em `ml_backend/app.py`. Aceita o upload de ficheiros de imagem (JPEG/PNG/WebP) e retorna a espÃ©cie, a raÃ§a inferida e um nÃ­vel de confianÃ§a combinado (mÃ©dia geomÃ©trica das probabilidades).
  * Inclui fallback gracioso para o classificador prÃ©-treinado na ausÃªncia de pesos finetunados locais.
* **Endpoint de DiagnÃ³stico (`GET /model-health`)**:
  * Fornece o estado atual do modelo (se estÃ¡ carregado em memÃ³ria, a origem dos pesos, o dispositivo de hardware ativo e nÃºmero de classes).
* **Testes de Qualidade da API (`ml_backend/tests/test_classify.py`)**:
  * Escrevemos 18 testes automatizados focados na API de classificaÃ§Ã£o, testando desde tipos de dados suportados, validaÃ§Ãµes de erros 415/400, atÃ© o tempo de processamento.
  * Todos os pesos e processadores pesados sÃ£o simulados (mocked) para execuÃ§Ã£o rÃ¡pida em ambientes de IntegraÃ§Ã£o ContÃ­nua (CI) sem necessidade de GPU ou downloads de 300 MB.

### 4. VerificaÃ§Ã£o e IntegraÃ§Ã£o ContÃ­nua (CI)
* **API FastAPI local**: Todos os 18 testes de rotas ML passaram com sucesso (`pytest`).
* **Testes Globais do Ecossistema**: Todos os 104 testes de integraÃ§Ã£o e frontend do Vitest continuam a passar com 100% de sucesso.
* **SincronizaÃ§Ã£o e Deploy**:
  * EfetuÃ¡mos o rebase e push de todas as alteraÃ§Ãµes para o repositÃ³rio principal no GitHub (`origin/main`).
  * RealizÃ¡mos o deploy automÃ¡tico do backend de ML para o Hugging Face Spaces (`huggingface/main`) atravÃ©s do comando `git subtree push`.

---

## ðŸŽ¨ 16. Demo Space PÃºblico no Hugging Face (Ronda 16) âœ…

CriÃ¡mos e colocÃ¡mos em produÃ§Ã£o o Space pÃºblico **firstoff/animalmind-demo** no Hugging Face para servir como montra da aplicaÃ§Ã£o.

### 1. Estrutura de Ficheiros Criada (`demo_space/`)
* **Gradio UI (`demo_space/app.py`)**:
  * Desenvolvemos uma interface web bonita, responsiva e moderna com tema escuro adaptado Ã  marca.
  * Suporta upload manual de imagens do cÃ£o/gato e exibe os resultados apÃ³s clique no botÃ£o **Analisar ðŸ”**.
  * Mostra a espÃ©cie detetada (com o emoji adequado ðŸ¶/ðŸ±), raÃ§a identificada, barra/slider de confianÃ§a (%) e o tempo total de processamento no servidor backend.
  * Lida com erros graciosamente (ex: servidor indisponÃ­vel ou imagem invÃ¡lida) exibindo alertas informativos claros na interface.
* **Exemplos PrÃ©-Carregados (`demo_space/examples/`)**:
  * GerÃ¡mos 4 imagens de alta qualidade com IA (`generate_image`) representando as principais raÃ§as para testes imediatos: Golden Retriever (`golden.png`), Gato SiamÃªs (`siamese.png`), Bulldog FrancÃªs (`bulldog.png`) e Gato Persa (`persian.png`).
* **DependÃªncias (`demo_space/requirements.txt`)**:
  * Declaradas as dependÃªncias mÃ­nimas necessÃ¡rias: `gradio`, `requests` e `Pillow`.
* **Metadata Card (`demo_space/README.md`)**:
  * Criada a descriÃ§Ã£o do Space com metadados YAML de configuraÃ§Ã£o obrigatÃ³ria (SDK Gradio, visibilidade pÃºblica, etc.).
  * Adicionada a instruÃ§Ã£o `python_version: 3.11` para contornar problemas de compatibilidade da remoÃ§Ã£o da biblioteca legada `audioop` nas versÃµes mais recentes do Python (3.13) usadas por omissÃ£o pelo Hugging Face.

### 2. SincronizaÃ§Ã£o e Deploy
* **Deploy no Hugging Face**:
  * UsÃ¡mos o script `scratch/deploy_space.py` com o pacote `huggingface_hub` para criar o repositÃ³rio pÃºblico `firstoff/animalmind-demo` e carregar todos os ficheiros locais da pasta `demo_space/`.
  * O Space compilou com sucesso com a versÃ£o do Python 3.11 e estÃ¡ totalmente operacional (`RUNNING`).
* **SincronizaÃ§Ã£o no GitHub**:
  * Todos os ficheiros da demo foram adicionados e submetidos num Ãºnico commit limpo na branch principal (`origin/main`).

### 3. Links PÃºblicos de Acesso
* **Demo Space PÃºblico**: [firstoff/animalmind-demo](https://huggingface.co/spaces/firstoff/animalmind-demo)
* **Backend API Oficial**: [firstoff/animalmind-backend](https://huggingface.co/spaces/firstoff/animalmind-backend)

---

## ðŸ”” 17. NotificaÃ§Ãµes Push FCM e IntegraÃ§Ã£o Capacitor (Ronda 17) âœ…

ImplementÃ¡mos com sucesso o suporte a **NotificaÃ§Ãµes Push Nativas** via Firebase Cloud Messaging (FCM) na aplicaÃ§Ã£o nativa Android (Capacitor) e a sua integraÃ§Ã£o com o servidor.

### 1. ConfiguraÃ§Ãµes Android Nativas
* **google-services.json**: Colocado o ficheiro de configuraÃ§Ã£o do Firebase em `android/app/google-services.json`.
* **Gradle Build (App)**: 
  * Atualizado o `namespace` e o `applicationId` para `"com.pawra.app"` em `android/app/build.gradle` para alinhar com o pacote registado no Firebase.
  * Adicionada a dependÃªncia do Firebase Messaging (`implementation 'com.google.firebase:firebase-messaging:24.0.0'`) sob a secÃ§Ã£o de dependÃªncias.
  * O plugin do Google Services Ã© aplicado automaticamente ao detetar o ficheiro `google-services.json`.
* **MainActivity & Estrutura Java**:
  * Movida a `MainActivity.java` de `com.animalmind.app` para o novo caminho de pacotes `com.pawra.app` (`android/app/src/main/java/com/pawra/app/MainActivity.java`).
  * Atualizada a declaraÃ§Ã£o de pacote no cabeÃ§alho do ficheiro para `package com.pawra.app;`.
* **PermissÃµes de Android**:
  * Adicionada a permissÃ£o `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />` no ficheiro `AndroidManifest.xml` para garantir suporte total a pedidos de notificaÃ§Ã£o em dispositivos modernos com Android 13+.

### 2. IntegraÃ§Ã£o no Cliente (Capacitor)
* **@capacitor/push-notifications**: Instalado o plugin nativo do Capacitor.
* **pushSetup.ts (`client/src/lib/pushSetup.ts`)**:
  * Expandida a lÃ³gica de `subscribeUserToPush` para intercetar se a aplicaÃ§Ã£o estÃ¡ a correr numa plataforma nativa (`Capacitor.isNativePlatform()`).
  * No ecossistema nativo, pede permissÃµes de receÃ§Ã£o ao utilizador via Capacitor API e, se autorizadas, executa o registo na Firebase.
  * Captura o token de registo FCM (`registration` event listener) e envia-o ao servidor utilizando o router tRPC `push.subscribe` mapeando o `endpoint` como `https://fcm.googleapis.com/fcm/send/${token}` e assinalando chaves especiais `{ p256dh: "native-fcm", auth: "native-fcm" }` para diferenciaÃ§Ã£o no backend.

### 3. IntegraÃ§Ã£o no Servidor (FCM Delivery Engine)
* **firebase-admin**: Instalado o SDK administrativo oficial do Firebase.
* **pushNotification.ts (`server/_core/pushNotification.ts`)**:
  * Criada a rotina de carregamento dinÃ¢mico e singleton do Firebase Admin SDK a partir de variÃ¡veis de ambiente (`FIREBASE_SERVICE_ACCOUNT_JSON` contendo a string da chave privada ou `FIREBASE_SERVICE_ACCOUNT_PATH`).
  * Desenvolvido o helper `sendNativeFcmNotification` que despacha notificaÃ§Ãµes para os tokens nativos usando o SDK Admin (FCM HTTP v1 API) e implementa um fallback automÃ¡tico usando o legacy HTTP API se apenas a chave string simples `FCM_SERVER_KEY` estiver configurada.
  * IntegraÃ§Ã£o transparente: Se a subscriÃ§Ã£o no base de dados tiver o campo `p256dh === "native-fcm"`, o servidor processa o envio usando a pilha nativa da Firebase em vez de cifrar o payload por Web Push tradicional.
  * Tratamento de Erros e Limpeza: Adicionada lÃ³gica de auto-limpeza de tokens invÃ¡lidos ou expirados (respostas 404/410 ou erros de token nÃ£o registado) removendo-os da base de dados Supabase imediatamente.

### 4. SincronizaÃ§Ã£o e ValidaÃ§Ã£o
* **CompilaÃ§Ã£o e Tipos**: O projeto compila com sucesso total e sem erros de tipos TypeScript (`npx tsc --noEmit`).
* **CompilaÃ§Ã£o Web**: `npx vite build` gerou a build de produÃ§Ã£o limpa.
* **SincronizaÃ§Ã£o**: Executado `npx cap sync` com sucesso, integrando todos os ficheiros compilados e os novos plugins ao projeto nativo Android.


## Original File: TEMPLATE_README.md

# Web App Template (tRPC + Manus Auth + Database)

This template gives you a React 19 + Tailwind 4 + Express 4 + tRPC 11 stack with Manus OAuth already wired. Procedures are your contracts, types flow end to end, and authentication "just works".

---

## Quick Facts

- **tRPC-first:** define procedures in `server/routers.ts`, consume them with `trpc.*` hooks.
- **Superjson out of the box:** return Drizzle rows directlyâ€”`Date` stays a `Date`.
- **Auth baked in:** `/api/oauth/callback` handles Manus OAuth, `protectedProcedure` injects `ctx.user`.
- **Gateway-ready:** all RPC traffic is under `/api/trpc`, making it easy to route at the edge.

---

## Build Loop (Four Touch Points)

1. Update schema in `drizzle/schema.ts`, then run `pnpm db:push`.
2. Add database helpers in `server/db.ts` (return raw results).
3. Add or extend procedures in `server/routers.ts`, then wire the UI with `trpc.*.useQuery/useMutation`.
4. Build frontend experience according to `Frontend Workflow`
5. Cover your changes with Vitest specs inside `server/*.test.ts` (see `server/auth.logout.test.ts`) and run `pnpm test`.

That's itâ€”no manual REST routes, no Axios client, no shared contract files.

---

## Key Files

```
server/auth.logout.test.ts â†’ Reference sample vitest test file
drizzle/schema.ts â†’ Database tables & types
server/db.ts â†’ Query helpers (reuse across procedures)
server/routers.ts â†’ tRPC procedures (auth + features)
client/src/App.tsx â†’ Routes wiring & layout shells
client/src/lib/trpc.ts â†’ tRPC client binding
client/src/pages/ â†’ Feature UI that calls trpc hooks
```

Framework plumbing (OAuth, context, Vite bridge) lives under `server/_core`.

---

## File Structure

```
client/
  public/         â† Small configuration files ONLY (favicon.ico, robots.txt). DO NOT put images/media here.
  src/
    pages/        â† Page-level components
    components/   â† Reusable UI & shadcn/ui
    contexts/     â† React contexts
    hooks/        â† Custom hooks
    lib/trpc.ts   â† tRPC client
    App.tsx       â† Routes & layout
    main.tsx      â† Providers
    index.css     â† global style
drizzle/          â† Schema & migrations
server/
  db.ts           â† Query helpers
  routers.ts      â† tRPC procedures
storage/          â† S3 helpers
shared/           â† Shared constants & types
```

Only touch the files under "â†" markers. Anything under `server/_core` or other tooling directories is framework-levelâ€”avoid editing unless you are extending the infrastructure.

### âš ï¸ Handling Images & Media

**DO NOT** store images, videos, or large assets in `client/public/` or `client/src/assets/`. Local media files will cause deployment timeouts.

**Required workflow:**
1. Upload assets using the CLI: `manus-upload-file --webdev path/to/image.png`
2. Use the returned storage path directly in your code: `<img src="/manus-storage/image_a1b2c3d4.png" />`
3. Store the original local file in `/home/ubuntu/webdev-static-assets/` (outside the project directory)

Only small configuration files like `favicon.ico`, `robots.txt`, and `manifest.json` belong in `client/public/`.

Files in `client/public` are available at the root of your siteâ€”reference them with absolute paths (`/robots.txt`, etc.) from HTML templates, JSX, or meta tags.

---

## Authentication Flow

- Manus OAuth completes at `/api/oauth/callback` and drops a session cookie.
- Each request to `/api/trpc` builds context via `server/_core/context.ts`, making the current user available as `ctx.user`.
- Wrap protected logic in `protectedProcedure`; public access uses `publicProcedure`.
- Frontend reads auth state with `trpc.auth.me.useQuery()` and invokes `trpc.auth.logout.useMutation()`â€”no cookie plumbing required.

---

## Environment Variables

Available pre-defined system envs:
- `DATABASE_URL`: MySQL/TiDB connection string
- `JWT_SECRET`: Session cookie signing secret
- `VITE_APP_ID`: Manus OAuth application ID
- `OAUTH_SERVER_URL`: Manus OAuth backend base URL
- `VITE_OAUTH_PORTAL_URL`: Manus login portal URL (frontend)
- `OWNER_OPEN_ID`, `OWNER_NAME`: Owner's info
- `BUILT_IN_FORGE_API_URL`: Manus built-in apis (includes llm, storage, data_api, notification, etc...)
- `BUILT_IN_FORGE_API_KEY`: Bearer token used by Manus built-in apis (server-side)
- `VITE_FRONTEND_FORGE_API_KEY`: Bearer token for frontend access to Manus built-in apis
- `VITE_FRONTEND_FORGE_API_URL`: Manus built-in apis URL for frontend

Do not edit these directly in code or commit `.env` files.
The envs above are system envs, when use env in website code, refer `server/_core/env.ts` for available list.

---

## Frontend Workflow

1. Choose a design style before you write any frontend code according to Design Guide (color, font, shadow, art style). Remember to edit `client/src/index.css` for global theming and add needed font using google font cdn in `client/index.html`.
2. Design the layout and navigation structure based on app purpose. Establish navigation in App.tsx accordingly:
  - **Personal tools & internal dashboards** (finance trackers, task managers, admin panels, personal finance apps, analytics): Use DashboardLayout with sidebar navigation for consistent experience.
  - **Public-facing products** (marketing sites, e-commerce, communities): Design custom navigation (top nav, contextual nav) and landing page to attract users.
3. Start by updating `client/src/pages/Home.tsx` (the landing page shell) using shadcn/ui components to introduce links, CTAs, or feature entry points. 
4. Create or update additional components under `client/src/pages/FeatureName.tsx`, continuing to leverage shadcn/ui + Tailwind for consistent styling.
5. Register the route (or navigation entry) in `client/src/App.tsx`.
6. Read data with `const { data, isLoading } = trpc.feature.useQuery(params);`.
7. Mutate data with `trpc.feature.useMutation()`. Use optimistic updates for list operations, toggles, and profile edits. For critical operations (payments, auth), use `invalidate` with loading states.
8. Use `useAuth()` for current user state, login URL from `getLoginUrl()`, and avoid direct cookie handling.
9. Handle loading/empty/error states in the UIâ€”tRPC already surfaces typed responses and errors.

---

## Frontend Development Guidelines

**tRPC & Data Management:**
- Use `trpc.*.useQuery/useMutation` for all backend callsâ€”never introduce Axios/fetch wrappers.
- **Use optimistic updates for instant feedback**: ideal for adding/editing/deleting list items, toggling states, updating profiles. Use `onMutate` to update cache, `onError` to rollback (The onMutate/onError/onSettled pattern). For critical operations (payments, auth), prefer `invalidate` with explicit loading states.
- When using `invalidate` as fallback: call `trpc.useUtils().feature.invalidate()` in mutation's `onSuccess`.
- Auth state comes from `useAuth()`; do not manipulate cookies manually.

**UI & Styling:**
- Prefer shadcn/ui components for interactions to keep a modern, consistent look; import from `@/components/ui/*` (e.g., `button`, `card`, `dialog`).
- Compose Tailwind utilities with component variants for layout and states; avoid excessive custom CSS. Use built-in `variant`, `size`, etc. where available.
- Preserve design tokens: keep the `@layer base` rules in `client/src/index.css`. Utilities like `border-border` and `font-sans` depend on them.
- Consistent design language: use spacing, radius, shadows, and typography via tokens. Extract shared UI into `components/` for reuse instead of copyâ€‘paste.
- Accessibility and responsiveness: keep visible focus rings and ensure keyboard reachability; design mobileâ€‘first with thoughtful breakpoints.
- Theming: Choose dark/light theme to start with for ThemeProvider according to your design style (dark or light bg), then manage colors pallette with CSS variables in `client/src/index.css` instead of hardâ€‘coding to keep global consistency.
- Microâ€‘interactions and empty states: add motion, empty states, and icons tastefully to improve quality without distracting from content.
- Navigation: For internal tools/admin panels, use persistent sidebar. For public-facing apps, design navigation based on content structure (top nav, side nav, or contextual)â€”ensure clear escape routes from all pages.
- Placeholder UI elements: When adding structural placeholders (nav items, table actions) for not-yet-implemented features, show toast on click ("Feature coming soon"). Inform user which elements are placeholders when presenting work.

**React Best Practices:**
- Never call setState/navigation in render phase â†’ wrap in `useEffect`

**Customized Defaults:**
This template customizes some Tailwind/shadcn defaults for simplified usage:
- `.container` is customized to auto-center and add responsive padding (see `index.css`). Use directly without `mx-auto`/`px-*`. For custom widths, use `max-w-*` with `mx-auto px-4`.
- `.flex` is customized to have `min-width:0` and `min-height:0` by default
- `button` variant `outline` uses transparent background (not `bg-background`). Add bg color class manually if needed.

---

## ðŸŽ¨ Design Guide

When generating frontend UI, avoid generic patterns that lack visual distinction:
- Avoid generic full-page centered layoutsâ€”prefer asymmetric/sidebar/grid structures for landing pages and dashboards
- Avoid applying dashboard/sidebar patterns to public-facing apps (forums, communities, e-commerce)â€”reserve those for internal tools
- When user provides vague requirements, make creative design decisions (choose specific color palette, typography, layout approach)
- Prioritize visual diversity: combine different design systems (e.g., one color scheme + different typography + another layout principle)
- For landing pages: prefer asymmetric layouts, specific color values (not just "blue"), and textured backgrounds over flat colors
- For dashboards: use defined spacing systems, soft shadows over borders, and accent colors for hierarchy

---

## Animation Guide

Bake motion taste in from the first line of code. Snappy, physically intuitive interactions are not a polish pass â€” they are part of the initial build.
- Decide whether to animate at all: keyboard-initiated actions (command palettes, shortcuts) must be instant â€” never animate them. High-frequency interactions (hover, list nav) should be minimal. Reserve richer motion for occasional events (modals, drawers, toasts) and rare delight moments (onboarding).
- Keep UI animations under 300ms. A 180ms dropdown feels significantly better than a 400ms one. Typical ranges: button press 100â€“160ms, tooltips 125â€“200ms, dropdowns 150â€“250ms, modals/drawers 200â€“500ms.
- Use strong custom easings, not the weak CSS defaults. Default to a snappy ease-out for entering/exiting UI: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);`. For moving/morphing use `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);`. NEVER use `ease-in` for UI animations â€” it feels sluggish.
- Buttons must feel responsive: add `transform: scale(0.97)` on `:active` with a ~160ms ease-out transition so the UI confirms it heard the user.
- Never animate from `scale(0)` â€” nothing in the real world appears from nothing. Start from `scale(0.95)` combined with `opacity: 0`.
- Origin-aware popovers/dropdowns: scale in from the trigger point (e.g. `transform-origin: var(--radix-popover-content-transform-origin)`). Modals are the exception and stay centered.
- Prefer CSS transitions over @keyframes for dynamic UI state. Transitions can be interrupted and reversed smoothly mid-flight; keyframes restart from zero and feel broken when interrupted.
- Only animate `transform` and `opacity` for motion â€” they run on the GPU and skip layout/paint. Avoid animating `width`, `height`, `padding`, `margin`, `top/left` unless absolutely necessary.
- Stagger grouped entrances by 30â€“80ms per item to create a cascading reveal instead of a wall of motion.
- Asymmetric timing for deliberate actions: hold-to-confirm should be slow and linear on press (e.g. 2s linear), but release/cancel should snap back fast (~200ms ease-out).
- Respect `prefers-reduced-motion`: gate non-essential motion behind `@media (prefers-reduced-motion: no-preference)`.

---

## Feature Checklist

- [ ] Tables updated in `drizzle/schema.ts`, migrations pushed (`pnpm db:push`)
- [ ] Query helper added in `server/db.ts` (returns raw Drizzle rows)
- [ ] Procedure created in `server/routers.ts` (choose `public` vs `protected`)
- [ ] UI calls the procedure via `trpc.*.useQuery/useMutation`
- [ ] Success + error paths verified in the browser

---

## Pre-built Components

Before implementing UI features, check if these components already exist:

Dashboard & Layout:
- `client/src/components/DashboardLayout.tsx` - Full dashboard layout with sidebar navigation, auth handling, and user profile. Use this for any admin panel or dashboard-style app instead of building from scratch.
- `client/src/components/DashboardLayoutSkeleton.tsx` - Loading skeleton for dashboard during auth checks

Chat & Messaging:
- `client/src/components/AIChatBox.tsx` - Full-featured chat interface with message history, streaming support, and markdown rendering. Use this for any chat/conversation UI instead of building from scratch.

Maps:
- `client/src/components/Map.tsx` - Google Maps integration with proxy authentication. Provides MapView component with onMapReady callback for initializing Google Maps services (Places, Geocoder, Directions, Drawing, etc.). All map functionality works directly in the browser.

When implementing features that match these categories, MUST evaluate the component first to decide whether to use or customize it.

---

## Internal Tools & Admin Panels

For certain app types, this template provides DashboardLayoutâ€”a standardized sidebar pattern.

**Use DashboardLayout for:**
- Admin/management dashboards
- Personal productivity apps (task managers, note-taking)
- Analytics/monitoring tools

**Do NOT use for:**
- Public content platforms (forums, blogs, social networks)
- E-commerce storefronts
- Marketing/landing sites

**Layout & Navigation**
- Use `DashboardLayout` component from `client/src/components/DashboardLayout.tsx` and remove any page-level headers to avoid duplication.
- When use DashboardLayout, read its content before making changes and preserve its core structure by default.

**Role-based Access Control**
When building apps with distinct access levels (e.g., e-commerce with public home, user account, admin panel):
- The `user` table includes a `role` field (enum: `admin` | `user`) for identity separation
- Use `ctx.user.role` in procedures to gate admin-only operations
- Wrap admin-only backend logic in `adminProcedure`
- Frontend can conditionally render navigation/routes based on `useAuth().user?.role`

Example procedure pattern:
```ts
adminOnlyProcedure: protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
  return next({ ctx });
}),
```

**Managing Admins**
- To promote a user to admin, update the `role` field directly in the database via the system UI or SQL
- If you need additional roles beyond `admin`/`user`, extend the enum in `drizzle/schema.ts` and push the migration

---

## LLM Integration

Use the preconfigured LLM helpers. Credentials are injected from the platform (no manual setup required).

```ts
import { invokeLLM } from "./server/_core/llm";

/**
 * Simple chat completion
 * type Role = "system" | "user" | "assistant" | "tool" | "function";
 * type TextContent = {
 *   type: "text";
 *   text: string;
 * };
 *
 * type ImageContent = {
 *   type: "image_url";
 *   image_url: {
 *     url: string;
 *     detail?: "auto" | "low" | "high";
 *   };
 * };
 *
 * type FileContent = {
 *   type: "file_url";
 *   file_url: {
 *     url: string;
 *     mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
 *   };
 * };
 *
 * export type Message = {
 *   role: Role;
 *   content: string | Array<ImageContent | TextContent | FileContent>
 * };
 *
 * Supported parameters:
 * messages: Array<{
 *   role: 'system' | 'user' | 'assistant' | 'tool',
 *   content: string | { tool_call: { name: string, arguments: string } }
 * }>
 * tool_choice?: 'none' | 'auto' | 'required' | { type: 'function', function: { name: string } }
 * tools?: Tool[]
 */
const response = await invokeLLM({
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello, world!" },
  ],
});
```

Tips
- Always call llm functions from server-side code (e.g., inside tRPC procedures), to avoid exposing your API key.
- You don't need to manually set the model; the helper uses a sensible default.
- LLM responses often contain markdown. Use `<Streamdown>{content}</Streamdown>` (imported from `streamdown`) to render markdown content with proper formatting and streaming support.

### Structured Responses (JSON Schema)

Ask the model to return structured JSON via `response_format`:

```ts
import { invokeLLM } from "./server/_core/llm";

const structured = await invokeLLM({
  messages: [
    { role: "system", content: "You are a helpful assistant designed to output JSON." },
    { role: "user", content: "Extract the name and age from the following text: \"My name is Alice and I am 30 years old.\"" },
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "person_info",
      strict: true,
      schema: {
        type: "object",
        properties: {
          name: { type: "string", description: "The name of the person" },
          age: { type: "integer", description: "The age of the person" },
        },
        required: ["name", "age"],
        additionalProperties: false,
      },
    },
  },
});

// The model responds with JSON content matching the schema.
// Access via `structured.choices[0].message.content` and JSON.parse if needed.
```
The helpers mirror the Python SDK semantics but produce JavaScript-first code, keeping credentials inside the server and ensuring every environment has access to the same token.

---

## Voice Transcription Integration

Use the preconfigured voice transcription helper that converts speech to text using Whisper API, no manual setup required.

Example usage:
```ts
import { transcribeAudio } from "./server/_core/voiceTranscription";

const result = await transcribeAudio({
  audioUrl: "https://storage.example.com/audio/recording.mp3",
  language: "en", // Optional: helps improve accuracy
  prompt: "Transcribe meeting notes" // Optional: context hint
});

// Returns native Whisper API response
// result.text - Full transcription
// result.language - Detected language (ISO-639-1)
// result.segments - Timestamped segments with metadata
```

Tips
- Accepts URL to pre-uploaded audio file
- 16MB file size limit enforced during transcription, size flag to be set by frontend
- Supported formats: webm, mp3, wav, ogg, m4a
- Returns native Whisper API response with rich metadata
- Frontend should handle audio capture, storage upload, and size validation

---

## Image Generation Integration

Use the preconfigured image generation helper that connects to the internal ImageService, no manual setup required.

Example usage:
```ts
import { generateImage } from "./server/_core/imageGeneration.ts";

const { url: imageUrl } = await generateImage({
  prompt: "A serene landscape with mountains"
});
// For editing:
const { url: imageUrl } = await generateImage({
  prompt: "Add a rainbow to this landscape",
  originalImages: [{
    url: "https://example.com/original.jpg",
    mimeType: "image/jpeg"
  }]
});
```

Tips
- Always call from server-side code (e.g., inside tRPC procedures) to avoid exposing API keys
- Image generation can take 5-20 seconds, implement proper loading states
- Implement proper error handling as image generation can fail

---

## â˜ï¸ File Storage

Use the preconfigured storage helpers in `server/storage.ts`. Credentials are injected from the platform (no manual setup required). Files are stored securely and served via the built-in `/manus-storage/` path â€” no manual URL management needed.

```ts
import { storagePut } from "./server/storage";

// Upload bytes to storage
const fileKey = `${userId}-files/${fileName}.png`
const { key, url } = await storagePut(
  fileKey,
  fileBuffer, // Buffer | Uint8Array | string
  "image/png"
);
// url = "/manus-storage/{key}" â€” use directly in frontend code
// key = unique storage key â€” save in database
```

Tips
- Save the `key` or `url` in your database; use storage for the actual file bytes. This applies to all files including images, documents, and media.
- For file uploads, have the client POST to your server, then call `storagePut` from your backend.
- The returned `url` (e.g. `/manus-storage/...`) is automatically served via signed redirect â€” no manual URL signing needed.
- To delete a file, drop its `key` from your DB and any UI references â€” the key is the only way to reach the object, so an unreferenced file is effectively gone. Do not implement a helper to remove the underlying object; the template's storage layer does not expose a delete endpoint.

---

## ðŸ—ºï¸ Maps Integration

**CRITICAL: The Manus proxy provides FULL access to ALL Google Maps features** - including advanced drawing, heatmaps, Street View, all layers, Places API, etc. Do ask users for Google Map API keys - authentication is automatic.

**Default: Use Frontend SDK** - Import MapView from `client/src/components/Map.tsx` and initialize ANY Google Maps service (geocoding, directions, places, drawing, visualization, geometry, etc.) in the onMapReady callback. 

**Use Backend API only when:**
- Persisting data (save routes/locations to database)
- Bulk operations (1000+ addresses)
- Server-side needs (caching, scheduled jobs, hiding business logic)

**Implementation:**
- Frontend: See `client/src/components/Map.tsx` for component usage - ALL Google Maps JavaScript API features work
- Backend: Create tRPC procedures using `makeRequest` from `server/_core/map.ts`

NEVER use external map libraries or request API keys from users - the Manus proxy handles everything automatically with no feature limitations.


---

## â˜ï¸ Data API

When you need external data, use the omni_search with search_type = 'api' to see there's any built-in api available in Manus API Hub access. You only have to connect other api if there's no suitable built-in api available.

---

## Owner Notifications

This template already ships with a `notifyOwner({ title, content })` helper (`server/_core/notification.ts`) and a protected tRPC mutation at `trpc.system.notifyOwner`. Use it whenever backend logic needs to push an operational update to the Manus project ownerâ€”common triggers are new form submissions, survey feedback, or workflow results.

1. On the server, call `await notifyOwner({ title, content })` or reuse the provided `system.notifyOwner` mutation from jobs/webhooks (`trpc.system.notifyOwner.useMutation()` on the client).
2. Handle the boolean return (`true` on success, `false` if the upstream service is temporarily unavailable) to decide whether you need a fallback channel.

Keep this channel for owner-facing alerts; end-user messaging should flow through your app-specific systems.

---

## â± Datetime & Timezone

Persistence: Store all business timestamps as UTC-based Unix timestamps (milliseconds since epoch) at the database and API layer. Do not store client-local, timezone-dependent, or string-based timestamps unless explicitly required as separate fields.
Frontend display: In React components, always convert UTC timestamps to the userâ€™s local timezone for display e.g. new Date(utcTimestamp).toLocaleString(). Keep all internal state and API interactions in UTC timestamps to avoid drift and confusion.

---

## Tips

- Keep router files under ~150 linesâ€”split into `server/routers/<feature>.ts` once they grow.
- Show loading states at component level (spinners, skeletons) rather than blocking entire pagesâ€”keeps the app feeling responsive.

---

## Core File References

Note: All TODO comments are remarks for the agent (you), not for the user.

`package.json`
```ts
{
  "name": "animalmind",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "NODE_ENV=development tsx watch server/_core/index.ts",
    "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc --noEmit",
    "format": "prettier --write .",
    "test": "vitest run",
    "db:push": "drizzle-kit generate && drizzle-kit migrate"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.693.0",
    "@aws-sdk/s3-request-presigner": "^3.693.0",
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-accordion": "^1.2.12",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-aspect-ratio": "^1.1.7",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-context-menu": "^2.2.16",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-hover-card": "^1.1.15",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-menubar": "^1.1.16",
    "@radix-ui/react-navigation-menu": "^1.2.14",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slider": "^1.3.6",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-toggle": "^1.1.10",
    "@radix-ui/react-toggle-group": "^1.1.11",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@tanstack/react-query": "^5.90.2",
    "@trpc/client": "^11.6.0",
    "@trpc/react-query": "^11.6.0",
    "@trpc/server": "^11.6.0",
    "axios": "^1.12.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "cookie": "^1.0.2",
    "date-fns": "^4.1.0",
    "dotenv": "^17.2.2",
    "drizzle-orm": "^0.44.5",
    "embla-carousel-react": "^8.6.0",
    "express": "^4.21.2",
    "framer-motion": "^12.23.22",
    "input-otp": "^1.4.2",
    "jose": "6.1.0",
    "lucide-react": "^0.453.0",
    "mysql2": "^3.15.0",
    "nanoid": "^5.1.5",
    "next-themes": "^0.4.6",
    "react": "^19.2.1",
    "react-day-picker": "^9.11.1",
    "react-dom": "^19.2.1",
    "react-hook-form": "^7.64.0",
    "react-resizable-panels": "^3.0.6",
    "recharts": "^2.15.2",
    "sonner": "^2.0.7",
    "streamdown": "^1.4.0",
    "superjson": "^1.13.3",
    "tailwind-merge": "^3.3.1",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^1.1.2",
    "wouter": "^3.3.5",
    "zod": "^4.1.12"
  },
  "devDependencies": {
    "@builder.io/vite-plugin-jsx-loc": "^0.1.1",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "^4.1.3",
    "@types/express": "4.17.21",
    "@types/google.maps": "^3.58.1",
    "@types/node": "^24.7.0",
    "@types/react": "^19.2.1",
    "@types/react-dom": "^19.2.1",
    "@vitejs/plugin-react": "^5.0.4",
    "add": "^2.0.6",
    "autoprefixer": "^10.4.20",
    "drizzle-kit": "^0.31.4",
    "esbuild": "^0.25.0",
    "pnpm": "^10.15.1",
    "postcss": "^8.4.47",
    "prettier": "^3.6.2",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.19.1",
    "tw-animate-css": "^1.4.0",
    "typescript": "5.9.3",
    "vite": "^7.1.7",
    "vite-plugin-manus-runtime": "^0.0.57",
    "vitest": "^2.1.4"
  },
  "packageManager": "pnpm@10.4.1+sha512.c753b6c3ad7afa13af388fa6d808035a008e30ea9993f58c6663e2bc5ff21679aa834db094987129aa4d488b86df57f7b634981b2f827cdcacc698cc0cfb88af",
  "pnpm": {
    "patchedDependencies": {
      "wouter@3.7.1": "patches/wouter@3.7.1.patch"
    },
    "overrides": {
      "tailwindcss>nanoid": "3.3.7"
    }
  }
}
```

`drizzle/schema.ts`
```ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here
```

`server/db.ts`
```ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.
```

`server/routers.ts`
```ts
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
```

`client/src/App.tsx`
```tsx
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
```

`client/src/lib/trpc.ts`
```ts
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();
```

`client/src/pages/Home.tsx`
```tsx
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Streamdown } from 'streamdown';

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  // If theme is switchable in App.tsx, we can implement theme toggling like this:
  // const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col">
      <main>
        {/* Example: lucide-react for icons */}
        <Loader2 className="animate-spin" />
        Example Page
        {/* Example: Streamdown for markdown rendering */}
        <Streamdown>Any **markdown** content</Streamdown>
        <Button variant="default">Example Button</Button>
      </main>
    </div>
  );
}
```

`server/auth.logout.test.ts`
```ts
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});
```
---

## Common Pitfalls

### Infinite loading loops from unstable references
**Anti-pattern:** Creating new objects/arrays in render that are used as query inputs
```tsx
// âŒ Bad: New Date() creates new reference every render â†’ infinite queries
const { data } = trpc.items.getByDate.useQuery({
  date: new Date(), // â† New object every render!
});

// âŒ Bad: Array/object literals in query input
const { data } = trpc.items.getByIds.useQuery({
  ids: [1, 2, 3], // â† New array reference every render!
});
```

**Correct approach:** Stabilize references with useState/useMemo
```tsx
// âœ… Good: Initialize once with useState
const [date] = useState(() => new Date());
const { data } = trpc.items.getByDate.useQuery({ date });

// âœ… Good: Memoize complex inputs
const ids = useMemo(() => [1, 2, 3], []);
const { data } = trpc.items.getByIds.useQuery({ ids });
```

**Why this happens:** TRPC queries trigger when input references change. Objects/arrays created in render have new references each time, causing infinite re-fetches.

### Storing file bytes in database columns
**Anti-pattern:** Adding BLOB/BYTEA columns to store file content
```ts
// âŒ Bad: Database bloat and slow queries
export const files = sqliteTable('files', {
  content: blob('content'), // Never store file bytes
});
```

**Correct approach:** Store S3 reference only, upload file bytes to S3
```ts
// âœ… Good: Store metadata + S3 reference
export const files = sqliteTable('files', {
  url: text('url').notNull(), // Url to reference the file in s3
  fileKey: text('file_key').notNull(), // also save file_key for clarity
  // optional, save other metadata if needed
  // filename: text('filename'),
  // mimeType: text('mime_type'),
});
```

Use `storagePut()` to upload files (see S3 File Storage section).

### Navigation dead-ends in subpages
**Problem:** Creating nested routes without escape routesâ€”no header nav, no sidebar, no back button.

**Root cause:** Implementing individual pages before establishing global layout structure.

**Solution:** Define layout wrapper in App.tsx first, then build pages inside it. For admin tools use DashboardLayout; for detail pages add back button with `router.back()`.

### Invisible text from theme/color mismatches

**Root cause:** Semantic colors (`bg-background`, `text-foreground`) are CSS variables that resolve based on ThemeProvider's active theme. Mismatches cause invisible text.

**Two critical rules:**

1. **Match theme to CSS variables:** If `defaultTheme="dark"` in App.tsx, ensure `.dark {}` in index.css has dark background + light foreground values
2. **Always pair bg with text:** When using `bg-{semantic}`, MUST also use `text-{semantic}-foreground` (not automatic - text inherits from parent otherwise)

**Quick reference:**
```tsx
// âœ… Theme + CSS alignment
<ThemeProvider defaultTheme="dark">  {/* Must match .dark in index.css */}
  <div className="bg-background text-foreground">...</div>
</ThemeProvider>

// âœ… Required class pairs
<div className="bg-popover text-popover-foreground">...</div>
<div className="bg-card text-card-foreground">...</div>
<div className="bg-accent text-accent-foreground">...</div>
```

### Nested anchor tags in Link components
**Problem:** Wrapping `<a>` tags inside another `<a>` or wouter's `<Link>` creates nested anchors and runtime errors.

**Solution:** Pass children directly to Linkâ€”it already renders an `<a>` internally.
```tsx
// âŒ Bad: <Link><a>...</a></Link> or <a><a>...</a></a>
// âœ… Good: <Link>...</Link> or just <a>...</a>
```

### Empty `Select.Item` values
**Rule:** Every `<Select.Item>` must have a non-empty `value` propâ€”never `""`, `undefined`, or omitted.

---

## Manus OAuth Best Practices

**Key Rule:** Always use `window.location.origin` for redirect URLsâ€”never hardcode domains or use `req.host`. Frontend and backend run on separate servers, so the frontend must pass its origin explicitly.

**Unsupported browsers:** Safari Private Browsing, Firefox Strict ETP, Brave Aggressive Shields, or any browser blocking cookies.

**Anti-patterns:**
```ts
// âŒ Never construct URLs from env vars or patterns
const url = `https://${projectName}.manus.space/callback`;
const url = `https://${process.env.APP_SUBDOMAIN}.example.com/verify`;
```

**Correct approach:** This template already implements the pattern correctly:
- `client/src/const.ts`: `getLoginUrl(returnPath?)` encodes origin + returnPath in state
- `server/_core/oauth.ts`: `parseState()` extracts origin from state for redirects

**For invite/magic links:** When backend generates URLs, frontend must pass origin in the request:
```ts
// Frontend
const createInvite = trpc.invites.create.useMutation();
await createInvite.mutateAsync({ eventId: "123", origin: window.location.origin });

// Backend - use input.origin to build the URL
const inviteUrl = `${input.origin}/events/${eventId}/join?token=${token}`;
```



