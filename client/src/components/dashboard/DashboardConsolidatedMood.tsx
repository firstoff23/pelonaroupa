import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { EmotionalState } from "../../../../shared/types";
import { STATE_COLORS } from "../../../../shared/types";

interface BeliefStateData {
  relaxed: number;
  excitement: number;
  distress: number;
  hunger: number;
  alert: number;
  attention: number;
}

interface DashboardConsolidatedMoodProps {
  beliefState?: BeliefStateData | null;
  dominantBelief?: { state: string; val: number } | null;
  states: EmotionalState[];
  t: (key: string) => string;
}

export function DashboardConsolidatedMood({
  beliefState,
  dominantBelief,
  states,
  t,
}: DashboardConsolidatedMoodProps) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("dashboardPage.consolidatedMood")}
        </h2>
        <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
          {t("dashboardPage.activeFilter")}
        </span>
      </div>

      {beliefState ? (
        <div className="space-y-3">
          {dominantBelief && (
            <div className="bg-secondary/20 p-3 rounded-xl border border-border flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center"
                style={{
                  backgroundColor: `${
                    STATE_COLORS[dominantBelief.state as EmotionalState]
                  }22`,
                  border: `2px solid ${STATE_COLORS[dominantBelief.state as EmotionalState]}44`,
                }}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor:
                      STATE_COLORS[dominantBelief.state as EmotionalState],
                  }}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("dashboardPage.stableMoodEstimated")}
                </p>
                <p
                  className="text-sm font-bold"
                  style={{
                    color: STATE_COLORS[dominantBelief.state as EmotionalState],
                  }}
                >
                  {t(`states.${dominantBelief.state}`)} (
                  {Math.round(dominantBelief.val * 100)}%)
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-1">
            {states.map((s) => {
              const val = (beliefState as any)[s] || 0;
              return (
                <div key={s} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: STATE_COLORS[s] }}
                      />
                      <span className="truncate">{t(`states.${s}`)}</span>
                    </span>
                    <span className="font-semibold text-foreground">
                      {Math.round(val * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${val * 100}%`,
                        backgroundColor: STATE_COLORS[s],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center text-xs text-muted-foreground py-2">
          {t("dashboardPage.calculatingBelief")}
        </div>
      )}

      <div className="pt-2 border-t border-border/50">
        <div className="grid grid-cols-2 gap-2">
          <Link href="/veterinario">
            <Button className="w-full bg-primary hover:bg-primary/90 font-semibold text-primary-foreground shadow-sm rounded-lg text-xs h-9">
              {t("dashboardPage.accessVetMode")}
            </Button>
          </Link>
          <Link href="/family">
            <Button className="w-full bg-secondary text-foreground hover:bg-secondary/80 border border-border rounded-lg text-xs h-9">
              {t("dashboardPage.family")}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
