import { Clock3, Mic, Sparkles } from "lucide-react";
import * as React from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLanguage } from "@/hooks/useLanguage";
import type { EmotionalState } from "../../../../shared/types";
import { STATE_COLORS } from "../../../../shared/types";
import { CompanionAvatar } from "./CompanionAvatar";
import type { CompanionResolution } from "./companionStates";

export interface CompanionDetailsContentProps {
  resolution: CompanionResolution;
  animal: {
    id: number;
    name: string;
    species?: string;
  };
  distribution?: Record<string, number>;
  narrative?: string | null;
  onClose?: () => void;
}

const EMOTIONAL_STATES_ORDER: EmotionalState[] = [
  "relaxed",
  "excitement",
  "attention",
  "alert",
  "hunger",
  "distress",
];

export function CompanionDetailsContent({
  resolution,
  animal,
  distribution,
  narrative,
  onClose,
}: CompanionDetailsContentProps) {
  const { t, language } = useLanguage();
  const isPt = language === "pt";

  const { config, stateId, percentage, totalEvents } = resolution;
  const isSleeping = stateId === "sleeping" || totalEvents < 3;

  const stateLabel =
    t(config.labelKey as any) ||
    (isPt ? config.fallbackLabelPt : config.fallbackLabelEn);

  const descriptionText = (
    t(config.descriptionKey as any) ||
    (isPt
      ? `O ${animal.name} esteve maioritariamente ${config.fallbackLabelPt.toLowerCase()} nos últimos 7 dias.`
      : `${animal.name} has been mostly ${config.fallbackLabelEn.toLowerCase()} over the last 7 days.`)
  ).replace("{{name}}", animal.name);

  // Compute breakdown segments
  const totalValidCounts = EMOTIONAL_STATES_ORDER.reduce((acc, st) => {
    return acc + Number(distribution?.[st] || 0);
  }, 0);

  const segments = EMOTIONAL_STATES_ORDER.map((st) => {
    const count = Number(distribution?.[st] || 0);
    const pct = totalValidCounts > 0 ? (count / totalValidCounts) * 100 : 0;
    return {
      state: st,
      count,
      pct,
      color: STATE_COLORS[st],
      label: t(`states.${st}` as any),
    };
  }).filter((seg) => seg.count > 0);

  return (
    <div className="space-y-6">
      <div className="text-center items-center space-y-2">
        {/* Avatar Hero */}
        <div className="py-2 flex justify-center">
          <CompanionAvatar
            stateId={stateId}
            species={animal.species}
            size={92}
            animalName={animal.name}
          />
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-bold flex items-center justify-center gap-2 text-foreground">
            <span>{animal.name}</span>
            <Badge
              variant="outline"
              className={`text-xs px-2.5 py-0.5 font-semibold ${config.badgeClass}`}
            >
              {stateLabel}{" "}
              {!isSleeping && percentage > 0 ? `(${percentage}%)` : ""}
            </Badge>
          </h3>

          <p className="text-xs text-muted-foreground">
            {isSleeping
              ? t("companion.insufficientData" as any) ||
                (isPt ? "Dados insuficientes" : "Insufficient data")
              : (
                  t("companion.sheet.totalEvents" as any) ||
                  (isPt
                    ? "{{count}} registos analisados nos últimos 7 dias"
                    : "{{count}} records analyzed in the last 7 days")
                ).replace("{{count}}", String(totalEvents))}
          </p>
        </div>
      </div>

      {/* Narrative / Description Snippet */}
      <div className="p-3.5 rounded-2xl bg-secondary/20 border border-border/70 text-xs leading-relaxed text-foreground">
        <p className="font-medium">{descriptionText}</p>
        {narrative && narrative !== descriptionText && (
          <p className="text-muted-foreground mt-1.5 pt-1.5 border-t border-border/40 italic">
            "{narrative}"
          </p>
        )}
      </div>

      {/* 7-Day Segmented Distribution Bar */}
      {!isSleeping && segments.length > 0 ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-foreground">
              {t("companion.sheet.distributionTitle" as any) ||
                (isPt
                  ? "Distribuição dos últimos 7 dias"
                  : "Last 7 days distribution")}
            </span>
            <span className="text-muted-foreground font-mono text-[11px]">
              100%
            </span>
          </div>

          {/* Segmented Bar */}
          <div
            className="h-3 w-full rounded-full bg-secondary/40 overflow-hidden flex"
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {segments.map((seg) => (
              <div
                key={seg.state}
                style={{
                  width: `${seg.pct}%`,
                  backgroundColor: seg.color,
                }}
                className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                title={`${seg.label}: ${Math.round(seg.pct)}% (${seg.count})`}
              />
            ))}
          </div>

          {/* Legend Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {segments.map((seg) => (
              <div
                key={seg.state}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="truncate">{seg.label}</span>
                <span className="font-semibold text-foreground ml-auto">
                  {Math.round(seg.pct)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty state info */
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-2">
          <Sparkles className="w-5 h-5 text-primary mx-auto opacity-70" />
          <h4 className="text-xs font-bold text-foreground">
            {t("companion.emptyState.title" as any) ||
              (isPt
                ? `Conhece o estado do ${animal.name}`
                : `Discover ${animal.name}'s mood`)}
          </h4>
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
            {t("companion.emptyState.description" as any) ||
              (isPt
                ? "Regista pelo menos 3 vocalizações para revelar a distribuição emocional completa."
                : "Log at least 3 vocalizations to reveal the full emotional distribution.")}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
        <Link
          to={`/historico?animalId=${animal.id}&period=7d`}
          onClick={() => onClose?.()}
        >
          <Button
            variant="outline"
            className="w-full h-11 rounded-2xl justify-center gap-2 text-xs font-semibold border-border/80 hover:bg-secondary/40 active-scale"
          >
            <Clock3 size={15} className="text-muted-foreground" />
            <span>
              {t("companion.sheet.viewHistory" as any) ||
                (isPt ? "Ver histórico completo" : "View complete history")}
            </span>
          </Button>
        </Link>

        <Link to="/capturar" onClick={() => onClose?.()}>
          <Button className="w-full h-11 rounded-2xl justify-center gap-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 active-scale">
            <Mic size={15} />
            <span>
              {t("companion.sheet.recordNew" as any) ||
                (isPt ? "Fazer nova gravação" : "Record new audio")}
            </span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

export interface CompanionSheetProps extends CompanionDetailsContentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanionSheet({
  open,
  onOpenChange,
  ...contentProps
}: CompanionSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-w-lg mx-auto rounded-t-3xl border-t border-border/80 bg-card p-6 pb-8 max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>
            {contentProps.animal.name} - Companheiro Emocional
          </SheetTitle>
          <SheetDescription>
            Resumo emocional dos últimos 7 dias
          </SheetDescription>
        </SheetHeader>
        <CompanionDetailsContent
          {...contentProps}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
