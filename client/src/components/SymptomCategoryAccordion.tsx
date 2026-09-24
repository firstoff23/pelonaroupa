import { AlertTriangle, Camera, Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import type {
  SymptomCategory,
  SymptomDefinition,
} from "../../../shared/symptoms";

interface SymptomCategoryAccordionProps {
  category: SymptomCategory;
  symptoms: SymptomDefinition[];
  checkedSymptoms: Set<string>;
  onToggleSymptom: (symptomId: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const SymptomCategoryAccordion: React.FC<
  SymptomCategoryAccordionProps
> = ({
  category,
  symptoms,
  checkedSymptoms,
  onToggleSymptom,
  isOpen,
  onToggleOpen,
}) => {
  const { t, language } = useLanguage();
  const isPt = language === "pt";

  const selectedCount = symptoms.filter((s) =>
    checkedSymptoms.has(s.id),
  ).length;

  const headerId = `category-header-${category.id}`;
  const panelId = `category-panel-${category.id}`;

  const categoryTitle =
    t(category.titleKey as any) ||
    (isPt ? category.fallbackTitlePt : category.fallbackTitleEn);
  const categoryDesc =
    t(category.descKey as any) ||
    (isPt ? category.fallbackDescPt : category.fallbackDescEn);

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden transition-all duration-200 shadow-sm">
      {/* Accordion Trigger */}
      <button
        type="button"
        id={headerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggleOpen}
        className={cn(
          "w-full p-4 flex items-center justify-between text-left transition-colors",
          "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          isOpen ? "bg-accent/20 border-b border-border/50" : "bg-card",
        )}
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <span className="text-2xl leading-none select-none flex-shrink-0">
            {category.emoji}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-foreground truncate">
                {categoryTitle}
              </h3>
              {selectedCount > 0 && (
                <Badge
                  variant="default"
                  className="bg-primary/20 text-primary border-primary/30 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                >
                  {selectedCount}{" "}
                  {t("symptoms.selectedBadge" as any) ||
                    (isPt ? "selecionado(s)" : "selected")}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {categoryDesc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <ChevronDown
            size={18}
            className={cn(
              "text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180 text-foreground",
            )}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* Accordion Panel */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={headerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {symptoms.map((symptom) => {
                const isChecked = checkedSymptoms.has(symptom.id);
                const itemLabel =
                  t(symptom.labelKey as any) ||
                  (isPt ? symptom.fallbackLabelPt : symptom.fallbackLabelEn);
                const itemDesc =
                  t(symptom.descKey as any) ||
                  (isPt ? symptom.fallbackDescPt : symptom.fallbackDescEn);

                return (
                  <button
                    key={symptom.id}
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() => onToggleSymptom(symptom.id)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150 relative",
                      isChecked
                        ? "bg-rose-500/10 border-rose-500/50 text-foreground shadow-sm ring-1 ring-rose-500/30"
                        : "bg-secondary/30 border-border/70 text-foreground hover:bg-secondary/60 hover:border-border",
                    )}
                  >
                    <span className="text-xl leading-none mt-0.5 flex-shrink-0">
                      {symptom.emoji}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold leading-tight text-foreground">
                          {itemLabel}
                        </span>

                        {symptom.isRedFlag && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30"
                            title={
                              isPt
                                ? "Sintoma potencialmente crítico (Red Flag)"
                                : "Potentially critical symptom (Red Flag)"
                            }
                          >
                            <AlertTriangle size={9} aria-hidden="true" />
                            Red flag
                          </span>
                        )}

                        {symptom.allowsPhoto && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-secondary text-muted-foreground border border-border"
                            title={
                              isPt
                                ? "Permite registo fotográfico"
                                : "Allows photo upload"
                            }
                          >
                            <Camera size={9} aria-hidden="true" />
                            Foto
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-2">
                        {itemDesc}
                      </p>
                    </div>

                    <div
                      className={cn(
                        "w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                        isChecked
                          ? "bg-rose-500 border-rose-600 text-white"
                          : "border-muted-foreground/40 bg-background",
                      )}
                      aria-hidden="true"
                    >
                      {isChecked && <Check size={11} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
