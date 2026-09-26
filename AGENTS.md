# AnimalMind Repository Guidelines & Agent Instructions

This repository contains **AnimalMind (PeloNaRoupa)**, an AI-powered health and wellness management platform for pets built with React, Vite, TypeScript, Tailwind, Capacitor (Android & iOS), Supabase (PostgreSQL), and Node.js.

---

## ⚡ Autonomous Skill Orchestration (MANDATORY)

Before executing any user task (building features, bug fixes, refactoring, tests, UI design, database updates, deployments):

1. **Auto-Detect Relevant Skills**:
   Run the skill detector script or match against domain keywords:
   ```bash
   python .agents/skills/skill-orchestrator/scripts/detect_skills.py "<user request>"
   ```
2. **Load Skill Instructions (`view_file`)**:
   Always load the `SKILL.md` of any matched skill (e.g. `frontend-design`, `webapp-testing`, `supabase-postgres-best-practices`, `typescript-pro`, `security-audit`, `docker-expert`).
3. **Announce Activated Skills**:
   Inform the user which skills were auto-detected and are actively guiding the implementation.

---

## 📋 Workspace Rules & Standards

- **React & TypeScript**:
  - Always type dynamic Lucide icons as `LucideIcon` from `lucide-react` (never `React.ElementType`).
  - Use `Array.from(new Set(arr))` instead of `[...new Set(arr)]` due to `downlevelIteration` settings.
  - When adding a new page, register it in `App.tsx`, `Sidebar.tsx` (with `PREFETCH_MAP`), and `BottomNav.tsx` (`activePaths`).
- **Testing**:
  - Web UI tests are run via Playwright (`pnpm test:e2e` or `pnpm e2e`).
  - Unit tests are run via Vitest (`pnpm test`).
  - Always verify responsive layouts on both mobile and desktop viewports.
- **Database & Security**:
  - Always enforce Row Level Security (RLS) on new Supabase tables.
  - Never execute unauthenticated destructive queries.
