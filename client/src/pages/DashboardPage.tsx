import { AlertCircle, Apple, Clock3, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { AlertBanner } from "@/components/AlertBanner";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { DailyCareWidget } from "@/components/care/DailyCareWidget";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { CompanionSheet } from "@/components/companion/CompanionSheet";
import { resolveCompanionState } from "@/components/companion/companionStates";
import { DashboardChartsSection } from "@/components/dashboard/DashboardChartsSection";
import { DashboardConsolidatedMood } from "@/components/dashboard/DashboardConsolidatedMood";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardFamilySection } from "@/components/dashboard/DashboardFamilySection";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AnimatedNumber } from "@/components/dashboard/DashboardHelpers";
import { DashboardTrackedAnimals } from "@/components/dashboard/DashboardTrackedAnimals";
import { TrendCard } from "@/components/TrendCard";
import { Button } from "@/components/ui/button";
import { WeeklyNarrativeCard } from "@/components/WeeklyNarrativeCard";
import { useAuth } from "@/contexts/AuthContext";
import { useMood } from "@/contexts/MoodContext";
import { useLanguage } from "@/hooks/useLanguage";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { CACHE_KEYS, getCachedData, setCachedData } from "@/lib/offlineCache";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type { EmotionalState } from "../../../shared/types";
import { STATE_COLORS, STATE_EMOJIS } from "../../../shared/types";

const STATES: EmotionalState[] = [
  "distress",
  "attention",
  "excitement",
  "hunger",
  "alert",
  "relaxed",
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { mood } = useMood();
  const { isAuthenticated } = useAuth();

  const [dashboardDays, setDashboardDays] = useState<7 | 30 | 90>(7);
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const [isCompanionSheetOpen, setIsCompanionSheetOpen] = useState(false);

  // Queries
  const {
    data: animals = [],
    isLoading: animalsLoading,
    error: animalsError,
    refetch: refetchAnimals,
  } = trpc.animals.list.useQuery(undefined, { enabled: isAuthenticated });

  const [cachedAnimals, setCachedAnimals] = useState<any[]>([]);
  const [cachedEvents, setCachedEvents] = useState<any[]>([]);
  const [cachedBeliefState, setCachedBeliefState] = useState<any>(null);

  // Hydrate offline cache
  useEffect(() => {
    getCachedData<any[]>(CACHE_KEYS.ANIMALS_LIST).then((data) => {
      if (data) setCachedAnimals(data);
    });
    getCachedData<any[]>(CACHE_KEYS.EVENTS_HISTORY).then((data) => {
      if (data) setCachedEvents(data);
    });
    getCachedData<any>("belief-state").then((data) => {
      if (data) setCachedBeliefState(data);
    });
  }, []);

  useEffect(() => {
    if (animals && animals.length > 0) {
      setCachedAnimals(animals);
      void setCachedData(CACHE_KEYS.ANIMALS_LIST, animals);
    }
  }, [animals]);

  const displayAnimals =
    animals && animals.length > 0 ? animals : cachedAnimals;
  const activeAnimal =
    displayAnimals.find((a) => a.isActive) ?? displayAnimals[0];

  const dashboardAnimalId = selectedAnimalId || activeAnimal?.id;
  const { data: dashboardStats } = trpc.events.statsForAnimal.useQuery(
    { animalId: dashboardAnimalId as number, days: dashboardDays },
    { enabled: !!dashboardAnimalId },
  );

  const utils = trpc.useUtils();
  const { data: invitations = [], refetch: refetchInvitations } =
    trpc.animals.getPendingInvitations.useQuery(undefined, {
      enabled: isAuthenticated,
      retry: false,
    });

  const { data: familyMembers = [] } = trpc.family.getMembers.useQuery(
    undefined,
    { enabled: isAuthenticated, retry: false },
  );
  const familyId = familyMembers[0]?.familyId;

  const { data: familyActivity = [] } = trpc.family.getActivity.useQuery(
    undefined,
    { enabled: isAuthenticated && !!familyId, retry: false },
  );

  const respondMutation = trpc.animals.respondToInvitation.useMutation({
    onSuccess: () => {
      toast.success(t("dashboardPage.responseSuccess"));
      refetchInvitations();
      utils.animals.list.invalidate();
      utils.animals.getActive.invalidate();
    },
    onError: (err) => {
      toast.error(`${t("dashboardPage.responseError")} ${err.message}`);
    },
  });

  const handleRespond = (invitationId: number, action: "accept" | "reject") => {
    respondMutation.mutate({ invitationId, action });
  };

  const { data: events = [], refetch: refetchEvents } =
    trpc.animals.weeklyStats.useQuery(
      { animalId: activeAnimal?.id },
      { enabled: !!activeAnimal },
    );

  const { data: beliefState, refetch: refetchBelief } =
    trpc.animals.getBeliefState.useQuery(
      { animalId: activeAnimal?.id },
      { enabled: !!activeAnimal },
    );

  useEffect(() => {
    if (events && events.length > 0) {
      setCachedEvents(events);
      void setCachedData(CACHE_KEYS.EVENTS_HISTORY, events);
    }
  }, [events]);

  useEffect(() => {
    if (beliefState) {
      setCachedBeliefState(beliefState);
      void setCachedData("belief-state", beliefState);
    }
  }, [beliefState]);

  const displayEvents = events && events.length > 0 ? events : cachedEvents;
  const displayBeliefState = beliefState || cachedBeliefState;

  const handleRefresh = async () => {
    await Promise.all([
      refetchAnimals(),
      refetchInvitations(),
      activeAnimal ? refetchEvents() : Promise.resolve(),
      activeAnimal ? refetchBelief() : Promise.resolve(),
    ]);
  };

  const { pullDistance, isRefreshing, touchHandlers } =
    usePullToRefresh(handleRefresh);

  const dashboardChartData = useMemo(() => {
    if (!dashboardStats?.dailyActivity) return [];

    return dashboardStats.dailyActivity.map((day) => {
      let dominantState = "relaxed" as EmotionalState;
      let maxCount = -1;

      STATES.forEach((state) => {
        const count = Number((day as any)[state] || 0);
        if (count > maxCount) {
          maxCount = count;
          dominantState = state;
        }
      });

      const d = new Date(day.date);
      const dateLabel = d.toLocaleDateString(
        language === "pt" ? "pt-PT" : "en-US",
        { day: "2-digit", month: "2-digit" },
      );

      return {
        label: dateLabel,
        confidence: day.avgConfidence,
        state: dominantState,
        emoji: STATE_EMOJIS[dominantState],
      };
    });
  }, [dashboardStats, language]);

  const dashboardNarrative = useMemo(() => {
    if (!dashboardStats?.stateDistribution || dashboardStats.totalCount === 0) {
      return null;
    }

    const entries = Object.entries(dashboardStats.stateDistribution);
    if (entries.length === 0) return null;

    const [dominantState] = entries.sort((a, b) => b[1] - a[1])[0];
    const animalName =
      displayAnimals.find((a) => a.id === dashboardAnimalId)?.name ||
      (language === "pt" ? "O teu animal" : "Your animal");

    const stateText = t(
      `states.${dominantState as EmotionalState}`,
    ).toLowerCase();

    if (language === "pt") {
      const period =
        dashboardDays === 7
          ? "Esta semana"
          : dashboardDays === 30
            ? "Neste mês"
            : "Nestes 3 meses";
      return `${period}, ${animalName} esteve maioritariamente ${stateText}.`;
    } else {
      const period =
        dashboardDays === 7
          ? "This week"
          : dashboardDays === 30
            ? "This month"
            : "These 3 months";
      return `${period}, ${animalName} was mostly ${stateText}.`;
    }
  }, [
    dashboardStats,
    dashboardAnimalId,
    displayAnimals,
    dashboardDays,
    t,
    language,
  ]);

  const companionAnimal = useMemo(() => {
    return (
      displayAnimals.find((a) => a.id === dashboardAnimalId) || activeAnimal
    );
  }, [displayAnimals, dashboardAnimalId, activeAnimal]);

  const companionResolution = useMemo(() => {
    return resolveCompanionState(
      dashboardStats?.stateDistribution,
      dashboardStats?.totalCount,
    );
  }, [dashboardStats]);

  const dominantBelief = useMemo(() => {
    if (!displayBeliefState) return null;
    const { relaxed, excitement, distress, hunger, alert, attention } =
      displayBeliefState;
    const statesList = [
      { state: "relaxed", val: relaxed },
      { state: "excitement", val: excitement },
      { state: "distress", val: distress },
      { state: "hunger", val: hunger },
      { state: "alert", val: alert },
      { state: "attention", val: attention },
    ];
    return statesList.sort((a, b) => b.val - a.val)[0];
  }, [displayBeliefState]);

  const barData = useMemo(() => {
    const counts: Record<EmotionalState, number> = {
      distress: 0,
      attention: 0,
      excitement: 0,
      hunger: 0,
      alert: 0,
      relaxed: 0,
    };
    for (const e of displayEvents) {
      if (e.state in counts) counts[e.state as EmotionalState]++;
    }
    return STATES.map((s) => ({
      name: t(`states.${s}`),
      value: counts[s],
      state: s,
      color: STATE_COLORS[s],
    }));
  }, [displayEvents, t]);

  const lineData = useMemo(() => {
    const byDay: Record<string, { sum: number; count: number }> = {};
    for (const e of displayEvents) {
      const day = new Date(e.createdAt).toLocaleDateString(
        language === "pt" ? "pt-PT" : "en-US",
        { weekday: "short" },
      );
      if (!byDay[day]) byDay[day] = { sum: 0, count: 0 };
      byDay[day].sum += e.confidence;
      byDay[day].count++;
    }
    return Object.entries(byDay).map(([day, { sum, count }]) => ({
      day,
      avg: Math.round((sum / count) * 100) / 100,
    }));
  }, [displayEvents, language]);

  const latestEvent = useMemo(() => {
    return (
      [...displayEvents].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0] ?? null
    );
  }, [displayEvents]);

  const locale = language === "pt" ? "pt-PT" : "en-US";

  if (animalsLoading) {
    return (
      <div className="relative min-h-full overflow-x-hidden" {...touchHandlers}>
        <div
          style={{
            transform: `translateY(${pullDistance}px)`,
            transition: pullDistance === 0 ? "transform 0.2s ease-out" : "none",
          }}
        >
          <AppShellSkeleton mode="content" variant="dashboard" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-hidden min-h-full" {...touchHandlers}>
      {/* Pull to refresh indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none transition-all duration-200 z-50"
        style={{
          top: `${pullDistance - 35}px`,
          opacity: pullDistance > 15 ? 1 : 0,
        }}
      >
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
          <Loader2
            size={12}
            className={cn(
              "text-primary",
              (isRefreshing || pullDistance >= 80) && "animate-spin",
            )}
          />
          <span className="text-[10px] text-muted-foreground font-medium">
            {isRefreshing
              ? "A atualizar..."
              : pullDistance >= 80
                ? "Solte para atualizar"
                : "Puxe para atualizar"}
          </span>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="min-h-full px-4 pt-6 pb-4 space-y-5 max-w-lg mx-auto"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? "transform 0.2s ease-out" : "none",
        }}
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <DashboardHeader
            activeAnimal={activeAnimal}
            mood={mood}
            title={t("dashboardPage.title")}
            language={language}
            locale={locale}
            latestEvent={latestEvent}
            t={t}
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 gap-3 select-none"
        >
          <Link to="/alimentos">
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl justify-start gap-2.5 border-border/60 hover:bg-muted/40 text-xs font-semibold px-4 active-scale tap-highlight-none"
            >
              <Apple className="h-4.5 w-4.5 text-primary" />
              <span>{language === "pt" ? "Alimentos" : "Foods"}</span>
            </Button>
          </Link>
          <Link to="/historico">
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl justify-start gap-2.5 border-border/60 hover:bg-muted/40 text-xs font-semibold px-4 active-scale tap-highlight-none"
            >
              <Clock3 className="h-4.5 w-4.5 text-secondary" />
              <span>{language === "pt" ? "Histórico" : "History"}</span>
            </Button>
          </Link>
        </motion.div>

        {/* Active Animal Alert Banner */}
        {activeAnimal && (
          <motion.div variants={itemVariants}>
            <AlertBanner animalId={activeAnimal.id} />
          </motion.div>
        )}

        {/* Tracked Animals Carousel */}
        {!animalsLoading && !animalsError && displayAnimals.length > 0 && (
          <motion.div variants={itemVariants}>
            <DashboardTrackedAnimals
              animals={displayAnimals}
              activeAnimalId={activeAnimal?.id}
              mood={mood}
              latestEventState={latestEvent?.state}
              language={language}
            />
          </motion.div>
        )}

        {/* Emotional Companion Card (Inspiração 3) */}
        {!animalsLoading && !animalsError && companionAnimal && (
          <motion.div variants={itemVariants}>
            <button
              type="button"
              onClick={() => setIsCompanionSheetOpen(true)}
              className="w-full text-left p-3.5 sm:p-4 rounded-3xl bg-card border border-border/70 hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-3 group active-scale cursor-pointer"
              aria-label={
                t("companion.tapForDetails" as any) ||
                (language === "pt"
                  ? "Toca para ver o resumo dos 7 dias"
                  : "Tap to view 7-day summary")
              }
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="shrink-0 p-1 rounded-2xl bg-secondary/20 group-hover:scale-105 transition-transform duration-200">
                  <CompanionAvatar
                    stateId={companionResolution.stateId}
                    species={companionAnimal.species}
                    size={64}
                    animalName={companionAnimal.name}
                  />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm sm:text-base text-foreground truncate">
                      {companionAnimal.name}
                    </span>
                    <span className="text-muted-foreground text-xs">—</span>
                    <span
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full border",
                        companionResolution.config.badgeClass,
                      )}
                    >
                      {t(companionResolution.config.labelKey as any) ||
                        (language === "pt"
                          ? companionResolution.config.fallbackLabelPt
                          : companionResolution.config.fallbackLabelEn)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground truncate">
                    {companionResolution.stateId === "sleeping"
                      ? t("companion.insufficientData" as any) ||
                        (language === "pt"
                          ? "Poucos registos nos últimos 7 dias"
                          : "Few records in the last 7 days")
                      : `${companionResolution.percentage}% ${
                          language === "pt"
                            ? "dos últimos 7 dias"
                            : "over the last 7 days"
                        }`}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all text-xs flex items-center gap-1 font-medium pl-1">
                <span className="hidden sm:inline text-[11px]">
                  {t("companion.tapForDetails" as any) ||
                    (language === "pt" ? "Detalhes" : "Details")}
                </span>
                <span className="text-base leading-none">›</span>
              </div>
            </button>

            <CompanionSheet
              open={isCompanionSheetOpen}
              onOpenChange={setIsCompanionSheetOpen}
              resolution={companionResolution}
              animal={companionAnimal}
              distribution={dashboardStats?.stateDistribution}
              narrative={dashboardNarrative}
            />
          </motion.div>
        )}

        {/* Weekly Narrative Card (SATELLAI-inspired) */}
        {!animalsLoading && !animalsError && activeAnimal && (
          <motion.div variants={itemVariants}>
            <WeeklyNarrativeCard
              animalId={dashboardAnimalId || activeAnimal.id}
              animalName={
                displayAnimals.find(
                  (a) => a.id === (dashboardAnimalId || activeAnimal.id),
                )?.name
              }
            />
          </motion.div>
        )}

        {/* Daily Care Widget (Inspiração 4: Coordenação Familiar) */}
        {!animalsLoading && !animalsError && activeAnimal && (
          <motion.div variants={itemVariants}>
            <DailyCareWidget
              animalId={dashboardAnimalId || activeAnimal.id}
              animalName={
                displayAnimals.find(
                  (a) => a.id === (dashboardAnimalId || activeAnimal.id),
                )?.name || activeAnimal.name
              }
            />
          </motion.div>
        )}

        {/* Error / Empty / Stats Cards */}
        {animalsError ? (
          <motion.div
            variants={itemVariants}
            className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center space-y-3 animate-shake"
          >
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <p className="text-sm text-foreground font-semibold">
              Erro ao carregar dados do dashboard.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Falha ao comunicar com o servidor. Verifique a sua ligação e tente
              novamente.
            </p>
            <Button
              size="sm"
              onClick={() => refetchAnimals()}
              className="bg-primary text-primary-foreground rounded-xl"
            >
              Tentar novamente
            </Button>
          </motion.div>
        ) : displayAnimals.length === 0 ? (
          <motion.div variants={itemVariants}>
            <DashboardEmptyState language={language} />
          </motion.div>
        ) : (
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 gap-3"
          >
            <div className="flex flex-col items-center justify-center p-4 text-center rounded-2xl bg-card border border-border shadow-sm">
              <span className="text-2xl font-bold text-primary">
                <AnimatedNumber value={events.length} />
              </span>
              <span className="text-xs text-muted-foreground mt-1 font-medium">
                {t("dashboardPage.statsRecordings")}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 text-center rounded-2xl bg-card border border-border shadow-sm">
              <span className="text-2xl font-bold text-primary">
                <AnimatedNumber value={animals.length} />
              </span>
              <span className="text-xs text-muted-foreground mt-1 font-medium">
                {t("dashboardPage.statsAnimals")}
              </span>
            </div>
          </motion.div>
        )}

        {/* Pending Invitations & Family Activity */}
        <motion.div variants={itemVariants}>
          <DashboardFamilySection
            invitations={invitations}
            familyActivity={familyActivity}
            isResponding={respondMutation.isPending}
            onRespond={handleRespond}
            language={language}
            t={t}
          />
        </motion.div>

        {/* Detailed Charts & POMDP Belief State */}
        {!animalsLoading && !animalsError && animals.length > 0 && (
          <div className="space-y-5 flex flex-col">
            <motion.div variants={itemVariants}>
              <TrendCard animalId={activeAnimal.id} />
            </motion.div>

            {/* POMDP Belief State - Humor Consolidado */}
            <motion.div variants={itemVariants}>
              <DashboardConsolidatedMood
                beliefState={beliefState}
                dominantBelief={dominantBelief}
                states={STATES}
                t={t}
              />
            </motion.div>

            {/* Charts Section */}
            <motion.div variants={itemVariants}>
              <DashboardChartsSection
                displayAnimals={displayAnimals}
                dashboardAnimalId={dashboardAnimalId}
                dashboardDays={dashboardDays}
                onDaysChange={setDashboardDays}
                onAnimalChange={setSelectedAnimalId}
                dashboardChartData={dashboardChartData}
                dashboardNarrative={dashboardNarrative}
                dashboardStats={dashboardStats}
                selectedAnimalName={
                  displayAnimals.find((a) => a.id === dashboardAnimalId)
                    ?.name || ""
                }
                barData={barData}
                lineData={lineData}
                states={STATES}
                eventsCount={events.length}
                language={language}
                t={t}
              />
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
