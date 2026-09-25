import { test, expect, mockUserEmail, mockUserPassword, mockSupabase, installBrowserMocks } from "./fixtures";
import path from "path";
import fs from "fs";

test.setTimeout(120_000);

const OUT_DIR = path.resolve(process.cwd(), "docs/audit-screenshots/after");

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

  await page.route("**/api/trpc/**", async (route: any) => {
    const req = route.request();
    const u = new URL(req.url());
    const encodedPath = u.pathname.split("/api/trpc/")[1] ?? "";
    const procedures = decodeURIComponent(encodedPath).split(",").map((p: string) => p.trim()).filter(Boolean);

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
          return personality !== undefined ? personality : {
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

test.describe("UI Audit After Fixes - Visual Evidence", () => {
  test("1. Prova do Radar de Personalidade montado em /animal/1", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupPage(page);
    await loginTutor(page);

    await page.goto("/animal/1");
    await page.waitForLoadState("networkidle");

    // Wait for PersonalityCard landmark
    await page.waitForSelector("section[aria-label*='Perfil de personalidade']", { timeout: 15_000 });
    // Verify radar chart container is rendered
    await page.waitForSelector("[aria-label*='Radar de personalidade']", { timeout: 10_000 });

    // Scroll to the personality card
    await page.evaluate(() => {
      const el = document.querySelector("section[aria-label*='Perfil de personalidade']");
      if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
    });
    await page.waitForTimeout(600);

    const outPath = path.join(OUT_DIR, "01-personality-card-mounted.png");
    await page.screenshot({ path: outPath });
    expect(fs.existsSync(outPath)).toBe(true);
  });

  test("2. Prova de resiliência a null invitations no Dashboard", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Set invitations explicitly to null
    await setupPage(page, { invitations: null, familyActivity: null });
    await loginTutor(page);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    // Verify Bobi and dashboard elements are displayed without ErrorBoundary crash
    await page.waitForSelector("text=Bobi", { timeout: 10_000 });

    const outPath = path.join(OUT_DIR, "02-dashboard-null-invitations-safe.png");
    await page.screenshot({ path: outPath });
    expect(fs.existsSync(outPath)).toBe(true);
  });

  test("3. Prova do botão 'Continuar no browser (Modo Desktop)' no MobileOnlyGate", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // Do NOT bypass gate to capture the new notice screen
    await setupPage(page, { isDesktop: false });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Verify button exists
    const continueBtn = page.getByTestId("continue-on-desktop-button");
    await expect(continueBtn).toBeVisible({ timeout: 10_000 });

    const outPath = path.join(OUT_DIR, "03-desktop-gate-continue-button.png");
    await page.screenshot({ path: outPath });
    expect(fs.existsSync(outPath)).toBe(true);
  });

  test("4. Prova do espaçamento pb-28 em /family", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupPage(page);
    await loginTutor(page);

    await page.goto("/family");
    await page.waitForLoadState("networkidle");

    // Scroll to the bottom of the page
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(600);

    const outPath = path.join(OUT_DIR, "04-family-pb28-spacing.png");
    await page.screenshot({ path: outPath });
    expect(fs.existsSync(outPath)).toBe(true);
  });

  test("5. Prova do título traduzido em PT (Passeio / Exercício Diário) no DailyCareBoard", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupPage(page);
    await loginTutor(page);

    await page.goto("/family");
    await page.waitForLoadState("networkidle");

    // Verify that the title is in Portuguese and not the raw key 'care.routine.walk'
    const walkTitle = page.locator("text=Passeio / Exercício Diário").first();
    await expect(walkTitle).toBeVisible({ timeout: 10_000 });

    // Scroll to the care board
    await walkTitle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const outPath = path.join(OUT_DIR, "05-care-board-pt-fallback.png");
    await page.screenshot({ path: outPath });
    expect(fs.existsSync(outPath)).toBe(true);
  });

  test("6. Prova de scroll horizontal nos chips de filtro do Histórico em ecrã 320px", async ({ page }) => {
    // Test on ultra-compact mobile (320x568 iPhone SE 1st gen)
    await page.setViewportSize({ width: 320, height: 600 });
    await setupPage(page);
    await loginTutor(page);

    await page.goto("/historico");
    await page.waitForLoadState("networkidle");

    // Verify horizontal period chips container is visible
    await page.waitForSelector("text=Todos", { timeout: 10_000 });
    await page.waitForSelector("text=7 dias", { timeout: 10_000 });

    const outPath = path.join(OUT_DIR, "06-history-horizontal-chips.png");
    await page.screenshot({ path: outPath });
    expect(fs.existsSync(outPath)).toBe(true);
  });
});
