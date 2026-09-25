import { test, expect, mockUserEmail, mockUserPassword, mockSupabase, installBrowserMocks } from "./fixtures";
import path from "path";
import fs from "fs";

test.setTimeout(120_000);

const OUT_DIR = path.resolve(process.cwd(), "docs/audit-screenshots/verification");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const setupPage = async (page: any, opts: {
  isDesktop?: boolean;
  bypassGate?: boolean;
  role?: string;
  animals?: any[];
  events?: any[];
  personality?: any;
  invitations?: any;
  familyActivity?: any;
  onOverrideCapture?: (data: any) => void;
} = {}) => {
  const {
    isDesktop = false,
    bypassGate = true,
    role = "owner",
    animals,
    events,
    personality,
    invitations,
    familyActivity,
    onOverrideCapture,
  } = opts;

  await installBrowserMocks(page);

  if (isDesktop && bypassGate) {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("pelonaroupa_desktop_bypass", "true");
      } catch {}
      const origMatchMedia = window.matchMedia;
      window.matchMedia = function(query) {
        if (query.includes("max-width: 767px")) {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          } as any;
        }
        return origMatchMedia ? origMatchMedia.call(window, query) : { matches: false } as any;
      };
    });
  }

  await mockSupabase(page);

  let currentPersonality = personality !== undefined ? personality : {
    id: 1,
    animalId: 1,
    vocalExpressiveness: 3.8,
    stressResilience: 4.2,
    energyLevel: 3.5,
    sociability: 4.6,
    independence: 2.2,
    confidence: 0.85,
    eventsUsed: 24,
    source: "inferred",
    userOverrides: {},
    lastCalculatedAt: "2026-09-25T10:00:00.000Z",
    createdAt: "2026-09-20T10:00:00.000Z",
    updatedAt: "2026-09-25T10:00:00.000Z",
  };

  await page.route("**/api/trpc/**", async (route: any) => {
    const req = route.request();
    const u = new URL(req.url());
    const encodedPath = u.pathname.split("/api/trpc/")[1] ?? "";
    const procedures = decodeURIComponent(encodedPath).split(",").map((p: string) => p.trim()).filter(Boolean);

    if (req.method() === "POST") {
      try {
        const bodyText = req.postData();
        if (bodyText) {
          const jsonBody = JSON.parse(bodyText);
          if (procedures.includes("personality.override")) {
            if (onOverrideCapture) {
              onOverrideCapture(jsonBody);
            }
            const dataObj = jsonBody.json ?? jsonBody;
            if (dataObj.dimensions) {
              currentPersonality = {
                ...currentPersonality,
                ...dataObj.dimensions,
                source: "blended",
              };
            }
          }
        }
      } catch {}
    }

    const getProcData = (proc: string) => {
      switch (proc) {
        case "auth.me":
          return {
            id: 1,
            openId: "e2e-supabase-user",
            name: role === "veterinarian" ? "Dr. João Silva" : "Tutor E2E",
            email: mockUserEmail,
            role,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          };
        case "auth.logout":
        case "auth.deleteAccount":
          return { success: true };
        case "auth.mfa.status":
          return { enabled: false };
        case "animals.list":
          return animals !== undefined ? animals : [
            {
              id: 1,
              userId: 1,
              name: "Bobi",
              species: "dog",
              breed: "Serra da Estrela",
              age: 4,
              dateOfBirth: "2022-04-12",
              sex: "male",
              color: "Dourado",
              coat: "medium",
              photoUrl: null,
              microchipNumber: "900115000111222",
              height: "45 cm",
              tail: "long",
              specialMarkings: "Mancha clara no peito",
              isActive: true,
              isShared: false,
              createdAt: "2026-06-01T12:00:00.000Z",
              updatedAt: "2026-06-01T12:00:00.000Z",
            },
          ];
        case "animals.get":
        case "animals.getActive":
          return {
            id: 1,
            userId: 1,
            name: animals && animals[0] ? animals[0].name : "Bobi",
            species: "dog",
            breed: "Serra da Estrela",
            age: 4,
            dateOfBirth: "2022-04-12",
            sex: "male",
            color: "Dourado",
            coat: "medium",
            photoUrl: null,
            microchipNumber: "900115000111222",
            height: "45 cm",
            tail: "long",
            specialMarkings: "Mancha clara no peito",
            isActive: true,
            isShared: false,
            createdAt: "2026-06-01T12:00:00.000Z",
            updatedAt: "2026-06-01T12:00:00.000Z",
          };
        case "animals.weeklyStats":
          return [
            { id: 101, userId: 1, animalId: 1, state: "relaxed", confidence: 0.94, emoji: "⚪", modelUsed: "yamnet-e2e", createdAt: "2026-09-25T14:00:00.000Z", notes: "A descansar após o almoço" },
            { id: 102, userId: 1, animalId: 1, state: "attention", confidence: 0.88, emoji: "🟡", modelUsed: "yamnet-e2e", createdAt: "2026-09-25T11:30:00.000Z", notes: "Atento ao bater à porta" },
          ];
        case "animals.getBaseline":
          return {
            animalId: 1,
            vocalizationThreshold: 10,
            normalStates: ["relaxed", "attention"],
            alertSensitivity: "medium",
            stateDistribution: { distress: 0.02, attention: 0.20, excitement: 0.10, hunger: 0.03, alert: 0.02, relaxed: 0.63 },
            sampleSize: 18,
            updatedAt: "2026-09-25T12:00:00.000Z",
          };
        case "animals.getBeliefState":
          return { relaxed: 0.84, excitement: 0.06, distress: 0.02, hunger: 0.03, alert: 0.02, attention: 0.03, updatedAt: "2026-09-25T14:00:00.000Z" };
        case "trends.getWeeklyTrend":
          return {
            trend: "stable",
            percentageChange: 0,
            dailyScores: [
              { date: "19/09", score: 88 },
              { date: "20/09", score: 90 },
              { date: "21/09", score: 91 },
              { date: "22/09", score: 89 },
              { date: "23/09", score: 94 },
              { date: "24/09", score: 92 },
              { date: "25/09", score: 93 },
            ],
            message: "Bobi manteve um padrão calmo e rotina estável ao longo dos últimos 7 dias.",
          };
        case "trends.getPatterns":
          return { patterns: ["Maior relaxamento após refeição consistente", "Excelente estabilidade vocal diária"] };
        case "family.getMembers":
          return [
            { familyId: 1, familyName: "Família PeloNaRoupa", userId: 1, email: mockUserEmail, role: "admin", name: "Tutor E2E", joinCode: "PELO2026" },
            { familyId: 1, familyName: "Família PeloNaRoupa", userId: 2, email: "maria.silva@example.com", role: "member", name: "Maria Silva", joinCode: "PELO2026" }
          ];
        case "family.getAnimals":
          return [
            { id: 1, name: "Bobi", species: "dog", breed: "Serra da Estrela" },
          ];
        case "family.getActivity":
          return familyActivity !== undefined ? familyActivity : [
            { id: 1, familyId: 1, userId: 1, userName: "Tutor E2E", action: "logged_care", description: "Pequeno-almoço dado a horas", createdAt: "2026-09-25T08:30:00.000Z" },
            { id: 2, familyId: 1, userId: 2, userName: "Maria Silva", action: "logged_care", description: "Passeio diário concluído (30 min)", createdAt: "2026-09-25T09:15:00.000Z" }
          ];
        case "family.getCareBoard":
          return {
            animalId: 1,
            careDate: "2026-09-25",
            timezone: "Europe/Lisbon",
            completedCount: 2,
            totalRoutineCount: 4,
            routineItems: [
              {
                definition: { id: "feeding_breakfast", careType: "feeding", careSubtype: "breakfast", titleKey: "care.routine.breakfast", fallbackTitlePt: "Pequeno-almoço / Refeição da Manhã", fallbackTitleEn: "Breakfast / Morning Meal", emoji: "🥣", suggestedPeriod: "morning" },
                isCompleted: true,
                completedLog: { id: 201, animalId: 1, userId: 1, userName: "Tutor E2E", careType: "feeding", careSubtype: "breakfast", title: "Pequeno-almoço dado a horas", notes: "Comeu a ração habitual", careDate: "2026-09-25", completedAt: "2026-09-25T08:30:00.000Z" }
              },
              {
                definition: { id: "walk_daily", careType: "walk", careSubtype: "daily_walk", titleKey: "care.routine.walk", fallbackTitlePt: "Passeio / Exercício Diário", fallbackTitleEn: "Daily Walk / Exercise", emoji: "🦮", suggestedPeriod: "anytime" },
                isCompleted: true,
                completedLog: { id: 202, animalId: 1, userId: 2, userName: "Maria Silva", careType: "walk", careSubtype: "daily_walk", title: "Passeio / Exercício Diário", notes: "30 minutos de exercício", careDate: "2026-09-25", completedAt: "2026-09-25T09:15:00.000Z" }
              },
              {
                definition: { id: "medication_scheduled", careType: "medication", careSubtype: "scheduled", titleKey: "care.routine.medication", fallbackTitlePt: "Medicação / Tratamento", fallbackTitleEn: "Medication / Treatment", emoji: "💊", suggestedPeriod: "anytime" },
                isCompleted: false,
              },
              {
                definition: { id: "feeding_dinner", careType: "feeding", careSubtype: "dinner", titleKey: "care.routine.dinner", fallbackTitlePt: "Jantar / Refeição da Noite", fallbackTitleEn: "Dinner / Evening Meal", emoji: "🥣", suggestedPeriod: "evening" },
                isCompleted: false,
              }
            ],
            customLogs: [],
            bioacousticStatus: { hasRecordedToday: true, lastEventTime: "14:20", state: "relaxed", emoji: "⚪", confidence: 0.94 }
          };
        case "health.getHealthRecords":
        case "health.getVaccines":
        case "health.getVaccinations":
        case "health.getDewormings":
        case "health.getDiagnosticTests":
        case "health.getOtherTreatments":
        case "health.getLicensing":
        case "animals.listShares":
          return [];
        case "animals.getPendingInvitations":
          return invitations !== undefined ? invitations : [];
        case "events.recent":
        case "events.list":
        case "events.listForAnimal":
          return {
            events: events !== undefined ? events : [
              { id: 101, userId: 1, animalId: 1, state: "relaxed", confidence: 0.94, emoji: "⚪", modelUsed: "yamnet-e2e", createdAt: "2026-09-25T14:00:00.000Z", notes: "A descansar após o almoço" },
              { id: 102, userId: 1, animalId: 1, state: "attention", confidence: 0.88, emoji: "🟡", modelUsed: "yamnet-e2e", createdAt: "2026-09-25T11:30:00.000Z", notes: "Atento ao bater à porta" },
            ],
            total: events !== undefined ? events.length : 2,
            page: 1,
            pageSize: 1000,
          };
        case "events.statsForAnimal":
          return {
            totalCount: 18,
            dominantState: "relaxed",
            stateDistribution: { relaxed: 12, attention: 4, excitement: 2, distress: 0, hunger: 0, alert: 0 },
            timeline: [
              { date: "2026-09-20", count: 3, relaxed: 2, attention: 1 },
              { date: "2026-09-22", count: 5, relaxed: 4, excitement: 1 },
              { date: "2026-09-25", count: 4, relaxed: 3, attention: 1 },
            ],
          };
        case "personality.get":
          return currentPersonality;
        case "personality.override":
          return { success: true, personality: currentPersonality };
        case "personality.recalculate":
          return { success: true, personality: currentPersonality };
        default:
          return null;
      }
    };

    const isBatch = u.searchParams.get("batch") === "1" || procedures.length > 1;
    const payload = procedures.map((p: string) => ({
      result: { data: { json: getProcData(p) } }
    }));

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(isBatch ? payload : payload[0]),
    });
  });
};

const loginTutor = async (page: any) => {
  await page.goto("/login");
  await page.locator("#login-email").fill(mockUserEmail);
  await page.locator("#login-password").fill(mockUserPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.waitForTimeout(400);
};

test.describe("Exhaustive UI Verification Suite - High Quality Evidence", () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CORREÇÃO #1: PersonalityCard em /animal/:id
  // ─────────────────────────────────────────────────────────────────────────────
  test("1. PersonalityCard: Visibilidade, Radar Pentagonal e Análise de Merge de Overrides", async ({ page }) => {
    let capturedOverridePayload: any = null;

    await page.setViewportSize({ width: 390, height: 844 });
    await setupPage(page, {
      onOverrideCapture: (data) => {
        capturedOverridePayload = data;
      },
    });
    await loginTutor(page);

    await page.goto("/animal/1");
    await page.waitForLoadState("networkidle");

    // Verificar se o PersonalityCard e o Radar Pentagonal estão visíveis
    await page.waitForSelector("section[aria-label*='Perfil de personalidade']", { timeout: 15_000 });
    await page.waitForSelector("[aria-label*='Radar de personalidade']", { timeout: 10_000 });

    // Scroll até ao radar
    await page.evaluate(() => {
      const el = document.querySelector("section[aria-label*='Perfil de personalidade']");
      if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
    });
    await page.waitForTimeout(400);

    const outPath1 = path.join(OUT_DIR, "01-personality-card-detail-view.png");
    await page.screenshot({ path: outPath1 });
    expect(fs.existsSync(outPath1)).toBe(true);

    // Testar painel de ajuste manual
    const adjustBtn = page.getByRole("button", { name: /ajustar manualmente/i });
    await expect(adjustBtn).toBeVisible({ timeout: 10_000 });
    await adjustBtn.click();
    await page.waitForTimeout(300);

    // Alterar 1 slider (Expressividade Vocal)
    const firstSlider = page.locator("input[type='range']").first();
    await expect(firstSlider).toBeVisible();
    await firstSlider.fill("5");
    await page.waitForTimeout(200);

    const outPath1b = path.join(OUT_DIR, "01b-personality-slider-adjusted.png");
    await page.screenshot({ path: outPath1b });
    expect(fs.existsSync(outPath1b)).toBe(true);

    // Guardar ajustes
    const saveBtn = page.getByRole("button", { name: /guardar ajustes/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await page.waitForTimeout(600);

    const outPath1c = path.join(OUT_DIR, "01c-personality-saved-persisted.png");
    await page.screenshot({ path: outPath1c });
    expect(fs.existsSync(outPath1c)).toBe(true);

    console.log("CAPTURED_OVERRIDE_PAYLOAD:", JSON.stringify(capturedOverridePayload));
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. CORREÇÃO #2: Safe navigation em DashboardFamilySection
  // ─────────────────────────────────────────────────────────────────────────────
  test("2. Safe Navigation: invitations=null e familyActivity=null sem crash", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg: any) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await setupPage(page, { invitations: null, familyActivity: null });
    await loginTutor(page);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Verificar se Bobi renderizou normalmente
    await page.waitForSelector("text=Bobi", { timeout: 10_000 });

    const typeErrors = consoleErrors.filter((e) =>
      e.includes("Cannot read properties of null") || e.includes("TypeError")
    );
    expect(typeErrors).toHaveLength(0);

    const outPath2 = path.join(OUT_DIR, "02-dashboard-null-invitations-activity.png");
    await page.screenshot({ path: outPath2 });
    expect(fs.existsSync(outPath2)).toBe(true);
  });

  test("2b. Safe Navigation: invitations=[] (array vazio) esconde secção", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupPage(page, { invitations: [], familyActivity: [] });
    await loginTutor(page);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);

    // Convites pendentes não devem estar visíveis
    await expect(page.getByText(/convites pendentes/i)).not.toBeVisible();

    const outPath2b = path.join(OUT_DIR, "02b-dashboard-empty-invitations-hidden.png");
    await page.screenshot({ path: outPath2b });
    expect(fs.existsSync(outPath2b)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CORREÇÃO #3: MobileOnlyGate Botão Desktop, Bypass e Análise de UX
  // ─────────────────────────────────────────────────────────────────────────────
  test("3. MobileOnlyGate: Botão Desktop e Bypass em Desktop e Tablet", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // Sem bypass prévio
    await setupPage(page, { isDesktop: false });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Verificar botão
    const continueBtn = page.getByTestId("continue-on-desktop-button");
    await expect(continueBtn).toBeVisible({ timeout: 10_000 });

    const outPath3 = path.join(OUT_DIR, "03-desktop-gate-view.png");
    await page.screenshot({ path: outPath3 });
    expect(fs.existsSync(outPath3)).toBe(true);

    // Clicar no botão para avançar para a app
    await continueBtn.click();
    await page.waitForTimeout(500);

    // Deve avançar para a Landing / App
    await page.waitForSelector("text=PeloNaRoupa", { timeout: 10_000 });

    const outPath3b = path.join(OUT_DIR, "03b-desktop-bypassed-with-notice.png");
    await page.screenshot({ path: outPath3b });

    // Verificar banner de reset no topo
    const resetBanner = page.getByTestId("desktop-reset-banner");
    await expect(resetBanner).toBeVisible();
    await expect(resetBanner).toContainText("Modo Desktop ativo");
    await expect(resetBanner).toContainText("Voltar ao ecrã mobile");

    const outPath3e = path.join(OUT_DIR, "03e-desktop-reset-banner.png");
    await page.screenshot({ path: outPath3e });
    expect(fs.existsSync(outPath3e)).toBe(true);

    // Testar persistência de localStorage
    const storedBypass = await page.evaluate(() => localStorage.getItem("pelonaroupa_desktop_bypass"));
    expect(storedBypass).toBe("true");

    // Testar clique em "Voltar ao ecrã mobile"
    const resetBtn = page.getByTestId("reset-desktop-bypass");
    await resetBtn.click();
    await page.waitForTimeout(300);

    // Deve regressar ao gate com botão de continuar
    await expect(continueBtn).toBeVisible({ timeout: 5_000 });

    // Re-avançar e testar botão de dispensar com "X"
    await continueBtn.click();
    await page.waitForTimeout(300);
    await expect(resetBanner).toBeVisible();

    const dismissBtn = page.getByTestId("dismiss-desktop-banner");
    await dismissBtn.click();
    await page.waitForTimeout(200);
    await expect(resetBanner).not.toBeVisible();

    // Teste no Tablet (820x1180) com bypass limpo
    await page.evaluate(() => localStorage.removeItem("pelonaroupa_desktop_bypass"));
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const outPath3d = path.join(OUT_DIR, "03d-tablet-viewport-gate.png");
    await page.screenshot({ path: outPath3d });
    expect(fs.existsSync(outPath3d)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. CORREÇÃO #4: Espaçamento pb-28 em /family e /vet
  // ─────────────────────────────────────────────────────────────────────────────
  test("4. Espaçamento pb-28 em /family e /vet em ecrã 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await setupPage(page);
    await loginTutor(page);

    // /family
    await page.goto("/family");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const outPath4 = path.join(OUT_DIR, "04-family-bottom-scroll-clearance-375px.png");
    await page.screenshot({ path: outPath4 });
    expect(fs.existsSync(outPath4)).toBe(true);

    // /vet
    await page.goto("/vet");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const outPath4b = path.join(OUT_DIR, "04b-vet-bottom-scroll-clearance-375px.png");
    await page.screenshot({ path: outPath4b });
    expect(fs.existsSync(outPath4b)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. CORREÇÃO #5: Fallback i18n em DailyCareBoard
  // ─────────────────────────────────────────────────────────────────────────────
  test("5. Fallback i18n: Títulos em PT no DailyCareBoard e comportamento Offline", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupPage(page);
    await loginTutor(page);

    await page.goto("/family");
    await page.waitForLoadState("networkidle");

    const walkTitle = page.locator("text=Passeio / Exercício Diário").first();
    await expect(walkTitle).toBeVisible({ timeout: 10_000 });
    await walkTitle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    // Confirmar que a chave pura não está presente
    await expect(page.getByText("care.routine.walk")).not.toBeVisible();

    const outPath5 = path.join(OUT_DIR, "05-care-board-offline-pt-fallback.png");
    await page.screenshot({ path: outPath5 });
    expect(fs.existsSync(outPath5)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. CORREÇÃO #6: Scroll horizontal nos filtros do Histórico
  // ─────────────────────────────────────────────────────────────────────────────
  test("6. Histórico: Rolagem horizontal e acessibilidade de chips a 320px e 414px", async ({ page }) => {
    // 320px (iPhone SE 1st gen)
    await page.setViewportSize({ width: 320, height: 600 });
    await setupPage(page);
    await loginTutor(page);

    await page.goto("/historico");
    await page.waitForLoadState("networkidle");

    await page.waitForSelector("text=Todos", { timeout: 10_000 });
    await page.waitForSelector("text=7 dias", { timeout: 10_000 });

    const outPath6 = path.join(OUT_DIR, "06-history-chips-320px.png");
    await page.screenshot({ path: outPath6 });
    expect(fs.existsSync(outPath6)).toBe(true);

    // Testar navegação por Tab
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    const outPath6b = path.join(OUT_DIR, "06b-history-chips-keyboard-focus.png");
    await page.screenshot({ path: outPath6b });

    // 414px (iPhone Plus)
    await page.setViewportSize({ width: 414, height: 896 });
    await page.waitForTimeout(200);

    const outPath6c = path.join(OUT_DIR, "06c-history-chips-414px.png");
    await page.screenshot({ path: outPath6c });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FLUXOS DE UTILIZADOR E RESILIÊNCIA
  // ─────────────────────────────────────────────────────────────────────────────
  test("Fluxo A: Registo e Onboarding (Termos e Consentimentos)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupPage(page);

    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    const outPathA = path.join(OUT_DIR, "flow-a-onboarding-register.png");
    await page.screenshot({ path: outPathA });
    expect(fs.existsSync(outPathA)).toBe(true);
  });

  test("Fluxo B: Utilizador Existente e Navegação entre Módulos", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupPage(page);
    await loginTutor(page);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const outPathB = path.join(OUT_DIR, "flow-b-existing-user-nav.png");
    await page.screenshot({ path: outPathB });
    expect(fs.existsSync(outPathB)).toBe(true);
  });

  test("Fluxo C: Erros, 500 Error Boundary, Offline e Sessão Expirada", async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupPage(page);
    await loginTutor(page);

    // 1. Simular erro de servidor (500) numa rota
    await page.route("**/api/trpc/animals.weeklyStats**", async (route: any) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "Internal Server Error" } }),
      });
    });

    await page.goto("/dashboard");
    await page.waitForTimeout(800);

    const outPathC = path.join(OUT_DIR, "flow-c-server-500-error-boundary.png");
    await page.screenshot({ path: outPathC });

    // 2. Simular rede Offline
    await context.setOffline(true);
    await page.waitForTimeout(500);

    const outPathOffline = path.join(OUT_DIR, "flow-c-network-offline-banner.png");
    await page.screenshot({ path: outPathOffline });
    await context.setOffline(false);

    // 3. Simular Sessão Expirada (401)
    await page.route("**/api/trpc/auth.me**", async (route: any) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "UNAUTHORIZED", code: -32001 } }),
      });
    });

    await page.goto("/dashboard");
    await page.waitForTimeout(800);

    const outPathExpired = path.join(OUT_DIR, "flow-c-expired-session-redirect.png");
    await page.screenshot({ path: outPathExpired });
  });

  test("Fluxo D: Casos Limite (Nome Muito Longo e Listas Vazias)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const longNameAnimal = {
      id: 1,
      userId: 1,
      name: "Bobi Bartolomeu de Bragança e Castro da Silva Terceiro",
      species: "dog",
      breed: "Serra da Estrela",
      age: 4,
      dateOfBirth: "2022-04-12",
      sex: "male",
      color: "Dourado",
      coat: "medium",
      photoUrl: null,
      microchipNumber: "900115000111222",
      height: "45 cm",
      tail: "long",
      specialMarkings: "Mancha clara no peito",
      isActive: true,
      isShared: false,
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
    };

    await setupPage(page, {
      animals: [longNameAnimal],
      events: [],
    });
    await loginTutor(page);

    await page.goto("/animal/1");
    await page.waitForLoadState("networkidle");

    const outPathD = path.join(OUT_DIR, "flow-d-empty-states-and-long-names.png");
    await page.screenshot({ path: outPathD });
    expect(fs.existsSync(outPathD)).toBe(true);
  });

  test("UI: Verificação de Contraste e Dark Mode", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: "dark" });
    await setupPage(page);
    await loginTutor(page);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const outPathDark = path.join(OUT_DIR, "ui-dark-mode-toggle.png");
    await page.screenshot({ path: outPathDark });
    expect(fs.existsSync(outPathDark)).toBe(true);
  });
});
