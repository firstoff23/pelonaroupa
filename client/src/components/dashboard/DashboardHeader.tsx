import { ChevronRight, Clock3, Mic, PawPrint, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EmotionalState } from "../../../../shared/types";
import { getHealthBadge } from "./DashboardHelpers";

interface DashboardHeaderProps {
  activeAnimal?: {
    id: number;
    name: string;
    photoUrl?: string | null;
  } | null;
  mood: "calm" | "concerned" | "neutral";
  title: string;
  language: string;
  locale: string;
  latestEvent?: {
    state: string;
    createdAt: Date | string;
  } | null;
  t: (key: string) => string;
}

const formatDashboardTimestamp = (value: Date | string, locale: string) =>
  new Date(value).toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function DashboardHeader({
  activeAnimal,
  mood,
  title,
  language,
  locale,
  latestEvent,
  t,
}: DashboardHeaderProps) {
  const activeAnimalHealth = getHealthBadge(latestEvent?.state);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border bg-card p-6 shadow-sm transition-all duration-500",
        mood === "calm"
          ? "border-mood-primary/15"
          : mood === "concerned"
            ? "border-mood-primary/25"
            : "border-mood-primary/15",
      )}
    >
      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {activeAnimal && (
              <motion.div
                animate={{
                  scale:
                    mood === "calm"
                      ? [1, 1.03, 1]
                      : mood === "concerned"
                        ? [1, 1.06, 1]
                        : [1, 1.04, 1],
                  boxShadow:
                    mood === "calm"
                      ? [
                          "0 0 0 0px rgba(52, 168, 83, 0.2)",
                          "0 0 0 8px rgba(52, 168, 83, 0)",
                          "0 0 0 0px rgba(52, 168, 83, 0)",
                        ]
                      : mood === "concerned"
                        ? [
                            "0 0 0 0px rgba(244, 180, 0, 0.4)",
                            "0 0 0 12px rgba(244, 180, 0, 0)",
                            "0 0 0 0px rgba(244, 180, 0, 0)",
                          ]
                        : [
                            "0 0 0 0px rgba(66, 133, 244, 0.3)",
                            "0 0 0 10px rgba(66, 133, 244, 0)",
                            "0 0 0 0px rgba(66, 133, 244, 0)",
                          ],
                }}
                transition={{
                  duration:
                    mood === "calm"
                      ? 3.0
                      : mood === "concerned"
                        ? 1.2
                        : 2.0,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="rounded-full shrink-0"
              >
                <Avatar className="h-14 w-14 border border-mood-primary/30 bg-black/20">
                  <AvatarImage
                    src={activeAnimal.photoUrl || undefined}
                    alt={activeAnimal.name}
                  />
                  <AvatarFallback className="bg-mood-primary/10 text-xl">
                    <PawPrint size={22} className="text-mood-primary/60" />
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-mood-primary/80 transition-all duration-500 tracking-wider">
                AnimalMind
              </p>
              <h1 className="mt-0.5 text-2xl font-bold text-foreground">
                {title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground leading-snug">
                {activeAnimal
                  ? mood === "calm"
                    ? language === "pt"
                      ? `O ${activeAnimal.name} está bem hoje`
                      : `${activeAnimal.name} is doing well today`
                    : mood === "concerned"
                      ? language === "pt"
                        ? `O ${activeAnimal.name} pode precisar de atenção — vê os detalhes`
                        : `${activeAnimal.name} might need attention — see details`
                      : language === "pt"
                        ? `Sem novidades com o ${activeAnimal.name}`
                        : `No updates for ${activeAnimal.name}`
                  : language === "pt"
                    ? "Comece por adicionar o seu primeiro animal."
                    : "Start by adding your first animal."}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-semibold shrink-0",
              activeAnimalHealth.className,
            )}
          >
            <ShieldCheck className="h-3 w-3 mr-1" />
            {activeAnimalHealth.label}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
          <Link to="/gravar">
            <Button className="h-auto w-full justify-between rounded-2xl px-4 py-4 text-left active-scale tap-highlight-none">
              <span className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/10 dark:bg-black/20">
                  <Mic className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold">
                    {language === "pt" ? "Gravar agora" : "Record now"}
                  </span>
                  <span className="block text-[11px] font-medium opacity-75">
                    {language === "pt"
                      ? "Classificação em segundos"
                      : "Classification in seconds"}
                  </span>
                </span>
              </span>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </Link>

          <div className="rounded-2xl border border-border bg-secondary/30 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5 text-amber-300" />
              {language === "pt" ? "Última gravação" : "Last recording"}
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {latestEvent
                ? t(`states.${latestEvent.state as EmotionalState}`)
                : language === "pt"
                  ? "Sem gravações ainda"
                  : "No recordings yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {latestEvent
                ? formatDashboardTimestamp(latestEvent.createdAt, locale)
                : language === "pt"
                  ? "A primeira análise aparece aqui."
                  : "The first analysis appears here."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
