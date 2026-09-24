import {
  CheckCircle2,
  ChevronRight,
  CircleDot,
  HeartPulse,
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export interface DailyCareWidgetProps {
  animalId: number;
  animalName: string;
}

export function DailyCareWidget({
  animalId,
  animalName,
}: DailyCareWidgetProps) {
  const { t, language } = useLanguage();
  const isPt = language === "pt";
  const userTimezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Lisbon";

  const { data: board } = trpc.family.getCareBoard.useQuery(
    { animalId, timezone: userTimezone },
    { enabled: !!animalId },
  );

  if (!board) return null;

  return (
    <div className="p-3.5 sm:p-4 rounded-3xl bg-card border border-border/70 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HeartPulse size={16} className="text-primary shrink-0" />
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">
              {t("care.title" as any) ||
                (isPt ? "Quadro de Cuidados Diários" : "Daily Care Board")}
            </h3>
            <span className="text-muted-foreground text-xs font-normal truncate hidden sm:inline">
              — {animalName}
            </span>
          </div>
        </div>

        <Link to="/familia">
          <span className="text-[11px] font-semibold text-primary flex items-center gap-0.5 hover:underline cursor-pointer">
            <span>
              {t("care.widget.openBoard" as any) ||
                (isPt ? "Abrir quadro" : "Open board")}
            </span>
            <ChevronRight size={13} />
          </span>
        </Link>
      </div>

      {/* Routine Task Pills */}
      <div className="flex flex-wrap gap-1.5">
        {board.routineItems.map(({ definition, isCompleted }) => {
          const title =
            t(definition.titleKey as any) ||
            (isPt ? definition.fallbackTitlePt : definition.fallbackTitleEn);

          return (
            <Link key={definition.id} to="/familia">
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 text-[11px] py-1 px-2.5 rounded-xl cursor-pointer transition-colors font-medium",
                  isCompleted
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-secondary/20 border-border/70 text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{definition.emoji}</span>
                <span>{title}</span>
                {isCompleted ? (
                  <CheckCircle2
                    size={11}
                    className="text-emerald-400 shrink-0"
                  />
                ) : (
                  <CircleDot size={10} className="text-amber-500/80 shrink-0" />
                )}
              </Badge>
            </Link>
          );
        })}
      </div>

      {/* Progress Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
        <span>
          {board.completedCount} / {board.totalRoutineCount}{" "}
          {t("care.widget.completedToday" as any) ||
            (isPt ? "concluídos hoje" : "completed today")}
        </span>
        {board.bioacousticStatus.hasRecordedToday && (
          <span className="text-primary font-medium flex items-center gap-1">
            <span>{board.bioacousticStatus.emoji}</span>
            <span>
              {t("care.widget.audioAnalyzedToday" as any) ||
                (isPt ? "Áudio analisado hoje" : "Audio analyzed today")}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
