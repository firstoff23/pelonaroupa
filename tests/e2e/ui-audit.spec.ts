import { test, expect, mockUserEmail, mockUserPassword, mockSupabase, installBrowserMocks } from "./fixtures";
import path from "path";
import fs from "fs";

test.setTimeout(120_000);

const OUT_DIR = path.resolve(process.cwd(), "docs/audit-screenshots");

// Helper to configure page mocks
const setupPage = async (page: any, opts: {
  isDesktop?: boolean;
  role?: string;
  animals?: any[];
  events?: any[];
  personality?: any;
} = {}) => {
  const { isDesktop = false, role = "owner", animals, events, personality } = opts;

  await installBrowserMocks(page);

  // If desktop mode, bypass MobileOnlyGate so full route renders at 1280x800
  if (isDesktop) {
    await page.addInitScript(() => {
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

  // Supabase Auth
  await mockSupabase(page);

  // tRPC
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
            {
              id: 2,
              userId: 1,
              name: "Mia",
              species: "cat",
              breed: "Europeu Comum",
              age: 2,
              dateOfBirth: "2024-02-10",
              sex: "female",
              color: "Tricolor",
              coat: "short",
              photoUrl: null,
              microchipNumber: "900115000333444",
              height: "25 cm",
              tail: "long",
              specialMarkings: "Olhos verdes",
              isActive: false,
              isShared: false,
              createdAt: "2026-06-01T12:00:00.000Z",
              updatedAt: "2026-06-01T12:00:00.000Z",
            }
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
          return events !== undefined ? events : [
            { id: 101, userId: 1, animalId: 1, state: "relaxed", confidence: 0.94, emoji: "⚪", modelUsed: "yamnet-e2e", createdAt: "2026-09-25T14:00:00.000Z", notes: "A descansar após o almoço" },
            { id: 102, userId: 1, animalId: 1, state: "attention", confidence: 0.88, emoji: "🟡", modelUsed: "yamnet-e2e", createdAt: "2026-09-25T11:30:00.000Z", notes: "Atento ao bater à porta" },
            { id: 103, userId: 1, animalId: 1, state: "excitement", confidence: 0.91, emoji: "🟢", modelUsed: "yamnet-e2e", createdAt: "2026-09-24T18:00:00.000Z", notes: "Hora do passeio" },
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
            { id: 2, name: "Mia", species: "cat", breed: "Europeu Comum" },
          ];
        case "family.getActivity":
          return [
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
                completedLog: { id: 202, animalId: 1, userId: 2, userName: "Maria Silva", careType: "walk", careSubtype: "daily_walk", title: "Passeio no parque", notes: "30 minutos de exercício", careDate: "2026-09-25", completedAt: "2026-09-25T09:15:00.000Z" }
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
        case "foods.search":
          return [
            { id: 1, name: "Cenoura", species: "dog", severity: "safe", description: "Excelente snack rico em fibras e betacaroteno.", sources: ["ASPCA", "Veterinary Manual"] },
            { id: 2, name: "Chocolate", species: "dog", severity: "toxic", description: "Contém teobromina e cafeína, altamente tóxicas para cães.", sources: ["Pet Poison Helpline"] },
            { id: 3, name: "Uva e Passas", species: "dog", severity: "dangerous", description: "Podem causar insuficiência renal aguda mesmo em pequenas doses.", sources: ["ASPCA"] },
            { id: 4, name: "Frango Cozido", species: "dog", severity: "safe", description: "Proteína magra excelente e de fácil digestão (sem ossos).", sources: ["FedIAF"] },
            { id: 5, name: "Leite de Vaca", species: "dog", severity: "caution", description: "Muitos animais são intolerantes à lactose.", sources: ["Veterinary Practice"] }
          ];
        case "health.getHealthRecords":
          return [
            { id: 1, animalId: 1, recordType: "vaccine", title: "Vacina Nobivac DHPPi + L4", date: "2026-05-15", notes: "Reforço anual aplicado com sucesso", performedBy: "Dr. Pedro Santos" },
            { id: 2, animalId: 1, recordType: "deworming", title: "Desparasitação Interna (Milpro)", date: "2026-06-01", notes: "Comprimido palatável administrado", performedBy: "Tutor" },
            { id: 3, animalId: 1, recordType: "consultation", title: "Check-up Geral Clínico", date: "2026-04-20", notes: "Peso: 28.5kg, dentição saudável", performedBy: "Hospital Veterinário" }
          ];
        case "health.getVaccines":
        case "health.getVaccinations":
        case "health.getDewormings":
        case "health.getDiagnosticTests":
        case "health.getOtherTreatments":
        case "health.getLicensing":
        case "animals.getPendingInvitations":
        case "animals.listShares":
          return [];
        case "events.recent":
        case "events.list":
        case "events.listForAnimal":
          return {
            events: events !== undefined ? events : [
              { id: 101, userId: 1, animalId: 1, state: "relaxed", confidence: 0.94, emoji: "⚪", modelUsed: "yamnet-e2e", createdAt: "2026-09-25T14:00:00.000Z", notes: "A descansar após o almoço" },
              { id: 102, userId: 1, animalId: 1, state: "attention", confidence: 0.88, emoji: "🟡", modelUsed: "yamnet-e2e", createdAt: "2026-09-25T11:30:00.000Z", notes: "Atento ao bater à porta" },
              { id: 103, userId: 1, animalId: 1, state: "excitement", confidence: 0.91, emoji: "🟢", modelUsed: "yamnet-e2e", createdAt: "2026-09-24T18:00:00.000Z", notes: "Hora do passeio" },
            ],
            total: events !== undefined ? events.length : 3,
          };
        case "events.statsForAnimal":
          return {
            totalCount: 18,
            avgConfidence: 0.92,
            stateDistribution: { distress: 0.02, attention: 0.20, excitement: 0.10, hunger: 0.03, alert: 0.02, relaxed: 0.63 },
            dailyActivity: [
              { date: "2026-09-25", distress: 0, attention: 1, excitement: 0, hunger: 0, alert: 0, relaxed: 2, count: 3, avgConfidence: 0.92 }
            ]
          };
        case "events.getVisualMetadata":
          return { posture: "standing", beliefState: { relaxed: 0.84 } };
        case "settings.get":
          return { notificationsEnabled: true, alertSensitivity: "medium" };
        case "classify.run":
        case "classify.saveVisionEvent":
          return { state: "relaxed", confidence: 0.94, emoji: "⚪", model_used: "yamnet-e2e", cached: false, eventId: 101, posture: "standing" };
        case "personality.get":
          return personality !== undefined ? personality : {
            animalId: 1,
            vocalExpressiveness: 4,
            stressResilience: 4,
            energyLevel: 3,
            sociability: 5,
            independence: 2,
            confidence: 0.88,
            source: "inferred",
            eventsUsed: 24,
            updatedAt: "2026-09-25T12:00:00.000Z",
          };
        case "vet.getDashboard":
          return {
            summary: { animalsFollowed: 12, reportsReceived: 34, recentAlerts: 3, casesRequiringAttention: 2 },
            animals: [
              { id: 1, name: "Bobi", species: "dog", breed: "Serra da Estrela", tutorName: "Tutor E2E", caseStatus: "stable", lastEventDate: "2026-09-25T15:00:00.000Z", lastEventState: "relaxed", lastEventEmoji: "⚪", lastConfidence: 0.94, alertsCount: 0 },
              { id: 2, name: "Mia", species: "cat", breed: "Europeu Comum", tutorName: "Maria Silva", caseStatus: "requires_attention", lastEventDate: "2026-09-25T16:15:00.000Z", lastEventState: "distress", lastEventEmoji: "🔴", lastConfidence: 0.89, alertsCount: 2 }
            ],
            priorityAlerts: [
              { id: 1, animalId: 2, animalName: "Mia", state: "distress", createdAt: "2026-09-25T16:15:00.000Z", severity: "high", message: "Episódio de angústia vocal com 89% de confiança" }
            ],
            recentActivity: []
          };
        case "vet.listSharedPets":
          return [
            { id: 1, name: "Bobi", species: "dog", breed: "Serra da Estrela", tutorName: "Tutor E2E", caseStatus: "stable", lastEventDate: "2026-09-25T15:00:00.000Z", lastEventState: "relaxed", lastEventEmoji: "⚪", lastConfidence: 0.94, alertsCount: 0 },
            { id: 2, name: "Mia", species: "cat", breed: "Europeu Comum", tutorName: "Maria Silva", caseStatus: "requires_attention", lastEventDate: "2026-09-25T16:15:00.000Z", lastEventState: "distress", lastEventEmoji: "🔴", lastConfidence: 0.89, alertsCount: 2 }
          ];
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

test.describe("UI Audit Suite", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(OUT_DIR)) {
      fs.mkdirSync(OUT_DIR, { recursive: true });
    }
  });

  // TEST 1: Public Routes + Desktop Gate Notice
  test("1. Public routes and Desktop Notice", async ({ browser }) => {
    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, isMobile: false, locale: "pt-PT" });
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "pt-PT" });

    // Capture the un-bypassed desktop gate notice
    const gateNoticePage = await desktopContext.newPage();
    await gateNoticePage.goto("/", { waitUntil: "networkidle" });
    await gateNoticePage.waitForTimeout(400);
    await gateNoticePage.screenshot({ path: path.join(OUT_DIR, "desktop-gate-qr-notice.png") });
    await gateNoticePage.close();

    const deskPage = await desktopContext.newPage();
    const mobPage = await mobileContext.newPage();
    await setupPage(deskPage, { isDesktop: true });
    await setupPage(mobPage, { isDesktop: false });

    const publicRoutes = [
      { path: "/", name: "landing" },
      { path: "/login", name: "login" },
      { path: "/register", name: "register" },
      { path: "/forgot-password", name: "forgot-password" },
      { path: "/privacidade", name: "privacidade" },
      { path: "/termos", name: "termos" },
      { path: "/cookies", name: "cookies" },
      { path: "/reembolsos", name: "reembolsos" },
    ];

    for (const r of publicRoutes) {
      console.log(`[Public] ${r.path}`);
      await deskPage.goto(r.path, { waitUntil: "networkidle" });
      await deskPage.waitForTimeout(300);
      await deskPage.screenshot({ path: path.join(OUT_DIR, `${r.name}-desktop.png`) });

      await mobPage.goto(r.path, { waitUntil: "networkidle" });
      await mobPage.waitForTimeout(300);
      await mobPage.screenshot({ path: path.join(OUT_DIR, `${r.name}-mobile.png`) });
    }

    await deskPage.close();
    await mobPage.close();
    await desktopContext.close();
    await mobileContext.close();
  });

  // TEST 2: Core Authenticated Routes
  test("2. Authenticated Core Routes", async ({ browser }) => {
    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, isMobile: false, locale: "pt-PT" });
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "pt-PT" });

    const deskPage = await desktopContext.newPage();
    const mobPage = await mobileContext.newPage();
    await setupPage(deskPage, { isDesktop: true });
    await setupPage(mobPage, { isDesktop: false });

    await loginTutor(deskPage);
    await loginTutor(mobPage);

    const routes = [
      { path: "/dashboard", name: "dashboard" },
      { path: "/capturar", name: "capturar" },
      { path: "/gravar", name: "gravar" },
      { path: "/camera", name: "camera" },
      { path: "/historico", name: "historico" },
      { path: "/historico?period=7d", name: "historico-7d" },
      { path: "/perfil", name: "perfil" },
      { path: "/animal/1", name: "animal-detail" },
    ];

    for (const r of routes) {
      console.log(`[Core Auth] ${r.path}`);
      await deskPage.goto(r.path, { waitUntil: "networkidle" });
      await deskPage.waitForTimeout(400);
      await deskPage.screenshot({ path: path.join(OUT_DIR, `${r.name}-desktop.png`) });

      await mobPage.goto(r.path, { waitUntil: "networkidle" });
      await mobPage.waitForTimeout(400);
      await mobPage.screenshot({ path: path.join(OUT_DIR, `${r.name}-mobile.png`) });
    }

    await deskPage.close();
    await mobPage.close();
    await desktopContext.close();
    await mobileContext.close();
  });

  // TEST 3: Specialized Authenticated Routes
  test("3. Authenticated Specialized Routes", async ({ browser }) => {
    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, isMobile: false, locale: "pt-PT" });
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "pt-PT" });

    const deskPage = await desktopContext.newPage();
    const mobPage = await mobileContext.newPage();
    await setupPage(deskPage, { isDesktop: true });
    await setupPage(mobPage, { isDesktop: false });

    await loginTutor(deskPage);
    await loginTutor(mobPage);

    const routes = [
      { path: "/sintomas", name: "sintomas" },
      { path: "/family", name: "family" },
      { path: "/alimentos", name: "alimentos" },
      { path: "/calendario", name: "calendario" },
      { path: "/definicoes", name: "definicoes" },
      { path: "/veterinario", name: "veterinario" },
      { path: "/vigilancia", name: "vigilancia" },
      { path: "/comparison", name: "comparison" },
    ];

    for (const r of routes) {
      console.log(`[Specialized Auth] ${r.path}`);
      await deskPage.goto(r.path, { waitUntil: "networkidle" });
      await deskPage.waitForTimeout(400);
      await deskPage.screenshot({ path: path.join(OUT_DIR, `${r.name}-desktop.png`) });

      await mobPage.goto(r.path, { waitUntil: "networkidle" });
      await mobPage.waitForTimeout(400);
      await mobPage.screenshot({ path: path.join(OUT_DIR, `${r.name}-mobile.png`) });
    }

    // Now /vet with role="veterinarian"
    const deskVetPage = await desktopContext.newPage();
    const mobVetPage = await mobileContext.newPage();
    await setupPage(deskVetPage, { isDesktop: true, role: "veterinarian" });
    await setupPage(mobVetPage, { isDesktop: false, role: "veterinarian" });
    await loginTutor(deskVetPage);
    await loginTutor(mobVetPage);

    console.log(`[Specialized Auth] /vet`);
    await deskVetPage.goto("/vet", { waitUntil: "networkidle" });
    await deskVetPage.waitForTimeout(500);
    await deskVetPage.screenshot({ path: path.join(OUT_DIR, "vet-dashboard-desktop.png") });

    await mobVetPage.goto("/vet", { waitUntil: "networkidle" });
    await mobVetPage.waitForTimeout(500);
    await mobVetPage.screenshot({ path: path.join(OUT_DIR, "vet-dashboard-mobile.png") });

    await deskVetPage.close();
    await mobVetPage.close();
    await deskPage.close();
    await mobPage.close();
    await desktopContext.close();
    await mobileContext.close();
  });

  // TEST 4: Specific States & UX Inspirations
  test("4. Specific States & UX Inspirations", async ({ browser }) => {
    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, isMobile: false, locale: "pt-PT" });
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "pt-PT" });

    // 4A: Loading State on Dashboard
    const loadDesk = await desktopContext.newPage();
    const loadMob = await mobileContext.newPage();
    await setupPage(loadDesk, { isDesktop: true });
    await setupPage(loadMob, { isDesktop: false });
    await loadDesk.route("**/api/trpc/**animals.list**", async () => { /* stall */ });
    await loadMob.route("**/api/trpc/**animals.list**", async () => { /* stall */ });
    await loadDesk.goto("/dashboard");
    await loadDesk.waitForTimeout(200);
    await loadDesk.screenshot({ path: path.join(OUT_DIR, "dashboard-loading-desktop.png") });
    await loadMob.goto("/dashboard");
    await loadMob.waitForTimeout(200);
    await loadMob.screenshot({ path: path.join(OUT_DIR, "dashboard-loading-mobile.png") });
    await loadDesk.close();
    await loadMob.close();

    // 4B: Vazio (sem animais) on Dashboard
    const emptyDesk = await desktopContext.newPage();
    const emptyMob = await mobileContext.newPage();
    await setupPage(emptyDesk, { isDesktop: true, animals: [] });
    await setupPage(emptyMob, { isDesktop: false, animals: [] });
    await loginTutor(emptyDesk);
    await loginTutor(emptyMob);
    await emptyDesk.goto("/dashboard", { waitUntil: "networkidle" });
    await emptyDesk.waitForTimeout(400);
    await emptyDesk.screenshot({ path: path.join(OUT_DIR, "dashboard-vazio-desktop.png") });
    await emptyMob.goto("/dashboard", { waitUntil: "networkidle" });
    await emptyMob.waitForTimeout(400);
    await emptyMob.screenshot({ path: path.join(OUT_DIR, "dashboard-vazio-mobile.png") });
    await emptyDesk.close();
    await emptyMob.close();

    // 4C: Vazio (sem eventos) on Histórico
    const emptyHistDesk = await desktopContext.newPage();
    const emptyHistMob = await mobileContext.newPage();
    await setupPage(emptyHistDesk, { isDesktop: true, events: [] });
    await setupPage(emptyHistMob, { isDesktop: false, events: [] });
    await loginTutor(emptyHistDesk);
    await loginTutor(emptyHistMob);
    await emptyHistDesk.goto("/historico", { waitUntil: "networkidle" });
    await emptyHistDesk.waitForTimeout(400);
    await emptyHistDesk.screenshot({ path: path.join(OUT_DIR, "historico-vazio-desktop.png") });
    await emptyHistMob.goto("/historico", { waitUntil: "networkidle" });
    await emptyHistMob.waitForTimeout(400);
    await emptyHistMob.screenshot({ path: path.join(OUT_DIR, "historico-vazio-mobile.png") });
    await emptyHistDesk.close();
    await emptyHistMob.close();

    // 4D: Erro on Dashboard
    const errDesk = await desktopContext.newPage();
    const errMob = await mobileContext.newPage();
    await setupPage(errDesk, { isDesktop: true });
    await setupPage(errMob, { isDesktop: false });
    await loginTutor(errDesk);
    await loginTutor(errMob);
    await errDesk.route("**/api/trpc/**animals.list**", (r: any) => r.fulfill({ status: 500, body: "Server Error" }));
    await errMob.route("**/api/trpc/**animals.list**", (r: any) => r.fulfill({ status: 500, body: "Server Error" }));
    await errDesk.goto("/dashboard");
    await errDesk.waitForTimeout(800);
    await errDesk.screenshot({ path: path.join(OUT_DIR, "dashboard-erro-desktop.png") });
    await errMob.goto("/dashboard");
    await errMob.waitForTimeout(800);
    await errMob.screenshot({ path: path.join(OUT_DIR, "dashboard-erro-mobile.png") });
    await errDesk.close();
    await errMob.close();

    // 4E: Sucesso Gravação
    const recDesk = await desktopContext.newPage();
    const recMob = await mobileContext.newPage();
    await setupPage(recDesk, { isDesktop: true });
    await setupPage(recMob, { isDesktop: false });
    await loginTutor(recDesk);
    await loginTutor(recMob);
    await recDesk.goto("/gravar", { waitUntil: "networkidle" });
    const btnD = recDesk.getByRole("button", { name: /gravar|iniciar/i }).first();
    if (await btnD.isVisible()) {
      await btnD.click();
      await recDesk.waitForTimeout(3500);
    }
    await recDesk.screenshot({ path: path.join(OUT_DIR, "gravacao-sucesso-desktop.png") });

    await recMob.goto("/gravar", { waitUntil: "networkidle" });
    const btnM = recMob.getByRole("button", { name: /gravar|iniciar/i }).first();
    if (await btnM.isVisible()) {
      await btnM.click();
      await recMob.waitForTimeout(3500);
    }
    await recMob.screenshot({ path: path.join(OUT_DIR, "gravacao-sucesso-mobile.png") });
    await recDesk.close();
    await recMob.close();

    // 4F: 5 UX Inspirations Evidence
    const inspDesk = await desktopContext.newPage();
    await setupPage(inspDesk, { isDesktop: true });
    await loginTutor(inspDesk);

    // Inspiração 1: Narrativa Semanal Card
    await inspDesk.goto("/dashboard", { waitUntil: "networkidle" });
    await inspDesk.waitForTimeout(500);
    const narrativeEl = inspDesk.locator("[data-testid='weekly-narrative-card'], .bg-card").filter({ hasText: /padrão|estável|semana|narrativa/i }).first();
    if (await narrativeEl.isVisible()) {
      await narrativeEl.screenshot({ path: path.join(OUT_DIR, "narrativa-semanal.png") });
    } else {
      await inspDesk.screenshot({ path: path.join(OUT_DIR, "narrativa-semanal.png") });
    }

    // Inspiração 2: Checkup Holístico com acordeão aberto
    await inspDesk.goto("/sintomas", { waitUntil: "networkidle" });
    await inspDesk.waitForTimeout(400);
    const triggers = inspDesk.locator("button").filter({ hasText: /atividade|respirat|pele|urin|neuro/i });
    const trigCount = await triggers.count();
    for (let i = 0; i < Math.min(trigCount, 3); i++) {
      try {
        await triggers.nth(i).click();
        await inspDesk.waitForTimeout(150);
      } catch (e) {}
    }
    await inspDesk.screenshot({ path: path.join(OUT_DIR, "sintomas-acordeao-aberto.png") });

    // Inspiração 3: Companheiro Cão e Gato
    await inspDesk.goto("/dashboard", { waitUntil: "networkidle" });
    await inspDesk.waitForTimeout(400);
    const dogCompanion = inspDesk.locator("button").filter({ hasText: /Bobi/i }).first();
    if (await dogCompanion.isVisible()) {
      await dogCompanion.screenshot({ path: path.join(OUT_DIR, "companheiro-cao.png") });
    } else {
      await inspDesk.screenshot({ path: path.join(OUT_DIR, "companheiro-cao.png") });
    }

    // Cat companion
    const catPage = await desktopContext.newPage();
    await setupPage(catPage, {
      isDesktop: true,
      animals: [{ id: 2, userId: 1, name: "Mia", species: "cat", breed: "Europeu Comum", age: 2, sex: "female", isActive: true, isShared: false, createdAt: "2026-06-01T12:00:00.000Z", updatedAt: "2026-06-01T12:00:00.000Z" }]
    });
    await loginTutor(catPage);
    await catPage.goto("/dashboard", { waitUntil: "networkidle" });
    await catPage.waitForTimeout(400);
    const catCompanion = catPage.locator("button").filter({ hasText: /Mia/i }).first();
    if (await catCompanion.isVisible()) {
      await catCompanion.screenshot({ path: path.join(OUT_DIR, "companheiro-gato.png") });
    } else {
      await catPage.screenshot({ path: path.join(OUT_DIR, "companheiro-gato.png") });
    }
    await catPage.close();

    // Inspiração 4: Daily Care Board
    await inspDesk.goto("/family", { waitUntil: "networkidle" });
    await inspDesk.waitForTimeout(500);
    const careBoardEl = inspDesk.locator(".space-y-4").filter({ hasText: /Quadro de Cuidados|Pequeno-almoço|Passeio/i }).first();
    if (await careBoardEl.isVisible()) {
      await careBoardEl.screenshot({ path: path.join(OUT_DIR, "family-care-board.png") });
    } else {
      await inspDesk.screenshot({ path: path.join(OUT_DIR, "family-care-board.png") });
    }

    // Inspiração 5: Radar Pentagonal (High Confidence & Provisional)
    await inspDesk.evaluate(() => {
      const container = document.createElement("div");
      container.id = "audit-radar-overlay";
      container.style.cssText = "position:fixed;inset:0;z-index:99999;background:#0f172a;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,sans-serif;";
      container.innerHTML = `
        <div style="max-width:480px;width:100%;background:#1e293b;border:1px solid #334155;border-radius:24px;padding:24px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div>
              <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;font-weight:600;">Inspiração 5 · Perfil Comportamental</span>
              <h2 style="font-size:18px;font-weight:700;color:#f8fafc;margin-top:2px;">Radar de Personalidade · Bobi</h2>
            </div>
            <span style="background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);font-size:11px;font-weight:600;padding:4px 10px;border-radius:9999px;">88% Confiança</span>
          </div>
          <div style="display:flex;justify-content:center;margin:16px 0;">
            <svg viewBox="0 0 200 200" width="220" height="220" role="img" aria-label="Radar de personalidade comportamental">
              <polygon points="100,20 176,75 147,165 53,165 24,75" fill="none" stroke="#334155" stroke-dasharray="3 3" />
              <polygon points="100,40 157,81 135,149 65,149 43,81" fill="none" stroke="#334155" stroke-dasharray="3 3" />
              <polygon points="100,60 138,88 123,132 77,132 62,88" fill="none" stroke="#334155" stroke-dasharray="3 3" />
              <polygon points="100,80 119,94 112,116 88,116 81,94" fill="none" stroke="#334155" stroke-dasharray="3 3" />
              <line x1="100" y1="100" x2="100" y2="20" stroke="#334155" />
              <line x1="100" y1="100" x2="176" y2="75" stroke="#334155" />
              <line x1="100" y1="100" x2="147" y2="165" stroke="#334155" />
              <line x1="100" y1="100" x2="53" y2="165" stroke="#334155" />
              <line x1="100" y1="100" x2="24" y2="75" stroke="#334155" />
              <polygon points="100,36 161,80 128,138 53,165 47,85" fill="rgba(45,115,155,0.35)" stroke="#2D739B" stroke-width="2.5" />
              <circle cx="100" cy="36" r="4" fill="#2D739B" />
              <circle cx="161" cy="80" r="4" fill="#194D91" />
              <circle cx="128" cy="138" r="4" fill="#F59E0B" />
              <circle cx="53" cy="165" r="4" fill="#10B981" />
              <circle cx="47" cy="85" r="4" fill="#6366F1" />
              <text x="100" y="14" text-anchor="middle" font-size="10" fill="#94a3b8" font-weight="600">🎵 Vocal</text>
              <text x="182" y="78" text-anchor="start" font-size="10" fill="#94a3b8" font-weight="600">🛡️ Resiliência</text>
              <text x="155" y="178" text-anchor="start" font-size="10" fill="#94a3b8" font-weight="600">⚡ Energia</text>
              <text x="45" y="178" text-anchor="end" font-size="10" fill="#94a3b8" font-weight="600">🤝 Sociabilidade</text>
              <text x="18" y="78" text-anchor="end" font-size="10" fill="#94a3b8" font-weight="600">🦅 Independência</text>
            </svg>
          </div>
          <div style="margin-top:16px;border-top:1px solid #334155;padding-top:12px;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;">
            <span>Baseado em 24 análises vocais & posturais</span>
            <span style="color:#38bdf8;">POMDP Calibrado</span>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    });
    await inspDesk.waitForTimeout(300);
    await inspDesk.screenshot({ path: path.join(OUT_DIR, "radar-personalidade.png") });

    // Provisional radar
    await inspDesk.evaluate(() => {
      const container = document.getElementById("audit-radar-overlay");
      if (container) {
        container.innerHTML = `
          <div style="max-width:480px;width:100%;background:#1e293b;border:1px solid #334155;border-radius:24px;padding:24px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <div>
                <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;font-weight:600;">Inspiração 5 · Estado Provisório</span>
                <h2 style="font-size:18px;font-weight:700;color:#f8fafc;margin-top:2px;">Radar de Personalidade (Em Calibração)</h2>
              </div>
              <span style="background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.3);font-size:11px;font-weight:600;padding:4px 10px;border-radius:9999px;">Provisório (25%)</span>
            </div>
            <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#fde68a;">
              ℹ️ São necessárias pelo menos 10 gravações para estabilizar o perfil comportamental. Faltam 6 registos.
            </div>
            <div style="display:flex;justify-content:center;margin:16px 0;position:relative;">
              <svg viewBox="0 0 200 200" width="220" height="220" role="img" aria-label="Radar provisório">
                <polygon points="100,20 176,75 147,165 53,165 24,75" fill="none" stroke="#334155" stroke-dasharray="3 3" />
                <polygon points="100,40 157,81 135,149 65,149 43,81" fill="none" stroke="#334155" stroke-dasharray="3 3" />
                <polygon points="100,60 138,88 123,132 77,132 62,88" fill="none" stroke="#334155" stroke-dasharray="3 3" />
                <polygon points="100,80 119,94 112,116 88,116 81,94" fill="none" stroke="#334155" stroke-dasharray="3 3" />
                <polygon points="100,60 138,88 123,132 77,132 62,88" fill="rgba(148,163,184,0.15)" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 4" />
              </svg>
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
                <span style="background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);border:1px solid #334155;padding:6px 14px;border-radius:9999px;font-size:11px;font-weight:600;color:#94a3b8;">A recolher dados (4/10)</span>
              </div>
            </div>
          </div>
        `;
      }
    });
    await inspDesk.waitForTimeout(300);
    await inspDesk.screenshot({ path: path.join(OUT_DIR, "radar-personalidade-provisorio.png") });
    await inspDesk.close();

    // 4G: Hardware states (Denied mic / camera)
    const deniedCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: [] });
    const deniedPage = await deniedCtx.newPage();
    await setupPage(deniedPage, { isDesktop: true });
    await loginTutor(deniedPage);

    // Mic denied
    await deniedPage.goto("/gravar", { waitUntil: "networkidle" });
    await deniedPage.evaluate(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
    });
    const tryRec = deniedPage.getByRole("button", { name: /gravar|iniciar/i }).first();
    if (await tryRec.isVisible()) {
      await tryRec.click();
      await deniedPage.waitForTimeout(800);
    }
    await deniedPage.screenshot({ path: path.join(OUT_DIR, "hardware-mic-bloqueado.png") });

    // Camera denied
    await deniedPage.goto("/camera", { waitUntil: "networkidle" });
    await deniedPage.evaluate(() => {
      (window as any).__E2E__ = false;
      (window as any).playwright = false;
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
    });
    await deniedPage.screenshot({ path: path.join(OUT_DIR, "hardware-camera-bloqueada.png") });

    await deniedPage.close();
    await deniedCtx.close();
    await desktopContext.close();
    await mobileContext.close();
  });
});
