import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { analyticsRouter } from "./routers/analytics";
import { animalsRouter } from "./routers/animals";
import { authRouter } from "./routers/auth";
import { classifyRouter } from "./routers/classify";
import { eventsRouter } from "./routers/events";
import { familyRouter } from "./routers/family";
import { feedbackRouter } from "./routers/feedback";
import { foodsRouter } from "./routers/foods";
import { healingRouter } from "./routers/healing";
import { healthRouter } from "./routers/health";
import { insightsRouter } from "./routers/insights";
import { pushRouter } from "./routers/push";
import { settingsRouter } from "./routers/settings";
import { trendsRouter } from "./routers/trends";
import { vetRouter } from "./routers/vet";

/**
 * Root Application Router.
 * Composes all domain sub-routers following the Single Responsibility Principle.
 */
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  classify: classifyRouter,
  animals: animalsRouter,
  events: eventsRouter,
  family: familyRouter,
  vet: vetRouter,
  health: healthRouter,
  trends: trendsRouter,
  insights: insightsRouter,
  healing: healingRouter,
  foods: foodsRouter,
  push: pushRouter,
  feedback: feedbackRouter,
  analytics: analyticsRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
