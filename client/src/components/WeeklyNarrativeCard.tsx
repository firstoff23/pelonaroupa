import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type { EmotionalState } from "../../../shared/types";
import { STATE_COLORS, STATE_EMOJIS } from "../../../shared/types";

interface WeeklyNarrativeCardProps {
  animalId: number;
  animalName?: string;
  className?: string;
}

export function WeeklyNarrativeCard({
  animalId,
  animalName,
  className,
}: WeeklyNarrativeCardProps) {
  const { t, language } = useLanguage();

  const { data, isLoading, error } = trpc.insights.getWeeklyNarrative.useQuery(
    {
      animalId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    {
      enabled: !!animalId,
      staleTime: 1000 * 60 * 60, // 1 hour client cache
    },
  );

  if (isLoading) {
    return (
      <Card
        className={cn(
          "rounded-2xl border border-border/70 shadow-sm bg-card overflow-hidden p-5 space-y-4",
          className,
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <div className="space-y-1">
              <Skeleton className="w-32 h-4 rounded" />
              <Skeleton className="w-20 h-3 rounded" />
            </div>
          </div>
          <Skeleton className="w-16 h-6 rounded-full" />
        </div>
        <Skeleton className="w-full h-12 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="w-24 h-7 rounded-lg" />
          <Skeleton className="w-24 h-7 rounded-lg" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const narrativeText =
    language === "pt" ? data.fallbackNarrative?.pt : data.fallbackNarrative?.en;

  const trendBadgeConfig = {
    improving: {
      label: t("weeklyNarrative.trend.improving"),
      icon: TrendingUp,
      colorClass:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    stable: {
      label: t("weeklyNarrative.trend.stable"),
      icon: Activity,
      colorClass:
        "bg-[#2D739B]/10 text-[#2D739B] dark:text-[#5fa8d3] border-[#2D739B]/20",
    },
    concerning: {
      label: t("weeklyNarrative.trend.concerning"),
      icon: AlertTriangle,
      colorClass:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    insufficient_data: {
      label: t("weeklyNarrative.trend.insufficient_data"),
      icon: HeartPulse,
      colorClass: "bg-muted/60 text-muted-foreground border-border/50",
    },
  }[data.trend];

  const TrendIcon = trendBadgeConfig.icon;

  const dominantStateEmoji = data.dominantState
    ? STATE_EMOJIS[data.dominantState as EmotionalState]
    : "🐾";
  const dominantStateColor = data.dominantState
    ? STATE_COLORS[data.dominantState as EmotionalState]
    : "#2D739B";

  const recommendationNotice =
    data.recommendationType === "vet_consult"
      ? t("weeklyNarrative.recommendations.vet_consult")
      : data.recommendationType === "positive_routine"
        ? t("weeklyNarrative.recommendations.positive_routine")
        : data.recommendationType === "record_more"
          ? t("weeklyNarrative.recommendations.record_more")
          : t("weeklyNarrative.recommendations.continue_monitoring");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card
        className={cn(
          "rounded-2xl border border-border/80 shadow-sm bg-gradient-to-br from-card via-card to-card/95 overflow-hidden transition-all duration-300 hover:shadow-md",
          className,
        )}
      >
        <CardContent className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xs">
                <Sparkles className="w-5 h-5 text-[#2D739B]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-1.5">
                  {t("weeklyNarrative.title")}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    ({data.periodDays}d)
                  </span>
                </h3>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {t("weeklyNarrative.subtitle")}
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1 border shadow-2xs",
                trendBadgeConfig.colorClass,
              )}
            >
              <TrendIcon className="w-3 h-3" />
              <span>{trendBadgeConfig.label}</span>
            </Badge>
          </div>

          {/* Narrative Body */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 text-xs leading-relaxed text-foreground font-medium select-text">
            {narrativeText}
          </div>

          {/* Structured Key Indicators */}
          {data.hasSufficientData ? (
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {/* Dominant State Badge */}
              {data.dominantState && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-card font-medium"
                  style={{
                    borderLeftColor: dominantStateColor,
                    borderLeftWidth: 3,
                  }}
                >
                  <span>{dominantStateEmoji}</span>
                  <span className="text-muted-foreground">
                    {language === "pt" ? "Predominante:" : "Dominant:"}
                  </span>
                  <span className="font-semibold text-foreground">
                    {data.templateParams.dominantState} (
                    {data.dominantPercentage}%)
                  </span>
                </div>
              )}

              {/* Distress Count */}
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium",
                  data.distressCount > 0
                    ? "border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400"
                    : "border-border/60 bg-card text-muted-foreground",
                )}
              >
                <span>{data.distressCount > 0 ? "🔴" : "✓"}</span>
                <span>
                  {data.distressCount}{" "}
                  {language === "pt" ? "angústia" : "distress"}
                  {data.distressPercentage > 0 &&
                    ` (${data.distressPercentage}%)`}
                </span>
              </div>

              {/* Total Recordings */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-card text-muted-foreground ml-auto">
                <span>📊</span>
                <span>
                  {data.totalRecordings}{" "}
                  {language === "pt" ? "gravações" : "recordings"}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-0.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>{recommendationNotice}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-1 flex items-center justify-between gap-3 border-t border-border/40">
            <span className="text-[10px] text-muted-foreground truncate">
              {data.hasSufficientData
                ? recommendationNotice
                : language === "pt"
                  ? "Requer mais registos"
                  : "Needs more records"}
            </span>

            <Link
              to={`/historico?animalId=${data.animalId}&period=7d`}
              className="shrink-0"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 rounded-xl text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1.5 transition-colors group"
              >
                <span>{t("weeklyNarrative.viewHistoryCta")}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
