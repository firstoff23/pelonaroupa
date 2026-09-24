import { ChevronRight, HeartPulse, PawPrint } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getHealthBadge } from "./DashboardHelpers";

interface AnimalItem {
  id: number;
  name: string;
  breed?: string | null;
  photoUrl?: string | null;
  isActive?: boolean;
}

interface DashboardTrackedAnimalsProps {
  animals: AnimalItem[];
  activeAnimalId?: number | null;
  mood: "calm" | "concerned" | "neutral";
  latestEventState?: string | null;
  language: string;
}

export function DashboardTrackedAnimals({
  animals,
  activeAnimalId,
  mood,
  latestEventState,
  language,
}: DashboardTrackedAnimalsProps) {
  if (animals.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase text-muted-foreground">
          {language === "pt" ? "Animais acompanhados" : "Tracked animals"}
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {animals.length}
        </span>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {animals.map((a) => {
          const isActiveAnimal = a.id === activeAnimalId;
          const status = getHealthBadge(
            isActiveAnimal ? latestEventState : null,
          );
          const photoUrl = a.photoUrl || undefined;

          return (
            <Link key={a.id} to={`/animal/${a.id}`}>
              <div
                className={cn(
                  "min-w-52.5 rounded-2xl border p-3 transition-all active-scale tap-highlight-none",
                  isActiveAnimal
                    ? "border-mood-primary/35 bg-mood-primary/10 shadow-[0_4px_20px_rgba(var(--mood-color-rgb),0.06)]"
                    : "border-border/70 bg-surface",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {isActiveAnimal ? (
                      <motion.div
                        animate={{
                          scale:
                            mood === "calm"
                              ? [1, 1.04, 1]
                              : mood === "concerned"
                                ? [1, 1.08, 1]
                                : [1, 1.06, 1],
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
                      >
                        <Avatar className="h-12 w-12 border border-mood-primary/35 bg-black/20">
                          <AvatarImage src={photoUrl} alt={a.name} />
                          <AvatarFallback className="bg-mood-primary/10 text-lg">
                            <PawPrint
                              size={18}
                              className="text-mood-primary/60"
                            />
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                    ) : (
                      <Avatar className="h-12 w-12 border border-white/10 bg-black/20">
                        <AvatarImage src={photoUrl} alt={a.name} />
                        <AvatarFallback className="bg-primary/10 text-lg">
                          <PawPrint size={18} className="text-primary/60" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {a.name}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {a.breed ||
                        (language === "pt"
                          ? "Raça não definida"
                          : "Breed not set")}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full text-[10px] font-semibold",
                      status.className,
                    )}
                  >
                    <HeartPulse className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
