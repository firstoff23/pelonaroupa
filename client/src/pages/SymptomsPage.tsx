import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  Loader2,
  PawPrint,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { compressImageToWebP } from "@/components/profile/ProfileHelpers";
import { SymptomCategoryAccordion } from "@/components/SymptomCategoryAccordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  ALL_SYMPTOMS,
  getCategoryForSymptom,
  getSymptomByLegacyOrId,
  hasAnyRedFlag,
  SYMPTOM_CATEGORIES,
  type SymptomSeverity,
  searchSymptoms,
} from "../../../shared/symptoms";

const SEVERITY_CONFIG: Record<
  SymptomSeverity,
  {
    labelPt: string;
    labelEn: string;
    descPt: string;
    descEn: string;
    badgeClass: string;
    activeBorder: string;
  }
> = {
  low: {
    labelPt: "Leve",
    labelEn: "Mild",
    descPt: "Sinais subtis, comportamento habitual",
    descEn: "Subtle signs, typical behavior",
    badgeClass: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    activeBorder: "border-emerald-500/60 bg-emerald-500/10 text-emerald-300",
  },
  medium: {
    labelPt: "Moderado",
    labelEn: "Moderate",
    descPt: "Incómodo visível, vigilância ativa",
    descEn: "Noticeable discomfort, close watch",
    badgeClass: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    activeBorder: "border-amber-500/60 bg-amber-500/10 text-amber-300",
  },
  high: {
    labelPt: "Grave",
    labelEn: "Severe",
    descPt: "Risco clínico elevado, atenção médica urgente",
    descEn: "High clinical risk, urgent attention",
    badgeClass: "text-red-400 border-red-500/30 bg-red-500/10",
    activeBorder: "border-red-500/60 bg-red-500/10 text-red-300",
  },
};

export default function SymptomsPage() {
  const { t, language } = useLanguage();
  const isPt = language === "pt";
  const searchInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: animals = [], isLoading: loadingAnimals } =
    trpc.animals.list.useQuery();
  const utils = trpc.useUtils();

  const activeAnimal = animals.find((a) => a.isActive) ?? animals[0];
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const selectedAnimal = selectedAnimalId
    ? animals.find((a) => a.id === selectedAnimalId)
    : activeAnimal;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [checkedSymptoms, setCheckedSymptoms] = useState<Set<string>>(
    new Set(),
  );
  const [severity, setSeverity] = useState<SymptomSeverity>("low");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Accordion open/collapse state (keyed by category ID)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    {
      nutrition: true,
      activity: false,
      respiratory: false,
      skin_coat: false,
      urinary: false,
      neurological: false,
      systemic: false,
    },
  );

  const toggleCategoryOpen = (categoryId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Existing records from healthRecords
  const { data: healthRecords = [], isLoading: loadingRecords } =
    trpc.health.getHealthRecords.useQuery(
      { animalId: selectedAnimal?.id ?? 0 },
      { enabled: !!selectedAnimal },
    );

  const symptomRecords = healthRecords.filter(
    (r) => r?.recordType === "notes" && r?.category === "symptom",
  );

  // Mutation to log symptoms with tracking to classification_events
  const logSymptomsMutation = trpc.health.logSymptoms.useMutation({
    onSuccess: () => {
      utils.health.getHealthRecords.invalidate({
        animalId: selectedAnimal?.id ?? 0,
      });
    },
  });

  const deleteRecordMutation = trpc.health.deleteHealthRecord?.useMutation?.({
    onSuccess: () => {
      utils.health.getHealthRecords.invalidate({
        animalId: selectedAnimal?.id ?? 0,
      });
    },
  });

  const toggleSymptom = (symptomId: string) => {
    setCheckedSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(symptomId)) {
        next.delete(symptomId);
      } else {
        next.add(symptomId);
      }
      return next;
    });
  };

  const removeSymptom = (symptomId: string) => {
    setCheckedSymptoms((prev) => {
      const next = new Set(prev);
      next.delete(symptomId);
      return next;
    });
  };

  // Search results
  const searchResults = useMemo(() => {
    return searchSymptoms(searchQuery, isPt ? "pt" : "en");
  }, [searchQuery, isPt]);

  // Red flag warning status
  const isRedFlagActive = useMemo(() => {
    return hasAnyRedFlag(checkedSymptoms, severity);
  }, [checkedSymptoms, severity]);

  // Check if any visual symptoms are checked
  const hasVisualSymptomSelected = useMemo(() => {
    let hasVisual = false;
    checkedSymptoms.forEach((id) => {
      if (hasVisual) return;
      const symptom = getSymptomByLegacyOrId(id);
      if (symptom?.allowsPhoto || symptom?.categoryId === "skin_coat") {
        hasVisual = true;
      }
    });
    return hasVisual;
  }, [checkedSymptoms]);

  // Photo handlers
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(
        isPt
          ? "Formato inválido. Por favor seleciona uma imagem."
          : "Invalid format. Please select an image.",
      );
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error(
        isPt
          ? "Imagem demasiado grande (máx: 8MB)."
          : "Image too large (max 8MB).",
      );
      return;
    }

    setIsCompressingPhoto(true);
    try {
      const compressedDataUrl = await compressImageToWebP(file, 640, 640);
      setPhotoUrl(compressedDataUrl);
      toast.success(
        t("symptoms.photoSection.success" as any) ||
          (isPt ? "Foto anexada com sucesso" : "Photo attached successfully"),
      );
    } catch (err) {
      console.error("[SymptomsPage] Failed to compress image:", err);
      toast.error(
        isPt ? "Erro ao processar imagem." : "Failed to process image.",
      );
    } finally {
      setIsCompressingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Save Checkup
  const handleSave = async () => {
    if (!selectedAnimal) {
      toast.error(
        t("symptoms.selectAnimalPrompt" as any) ||
          (isPt ? "Seleciona um animal primeiro." : "Select an animal first."),
      );
      return;
    }
    if (checkedSymptoms.size === 0) {
      toast.error(
        t("symptoms.selectSymptomPrompt" as any) ||
          (isPt
            ? "Seleciona pelo menos um sintoma."
            : "Select at least one symptom."),
      );
      return;
    }

    setIsSaving(true);
    try {
      const symptomList = Array.from(checkedSymptoms);
      const categorySet = new Set<string>();

      const symptomLabels = symptomList.map((id) => {
        const s = getSymptomByLegacyOrId(id);
        if (s) {
          categorySet.add(s.categoryId);
          return isPt ? s.fallbackLabelPt : s.fallbackLabelEn;
        }
        return id;
      });

      const summaryText = symptomLabels.join(", ");

      await logSymptomsMutation.mutateAsync({
        animalId: selectedAnimal.id,
        symptomIds: symptomList,
        categoryIds: Array.from(categorySet),
        severity,
        symptomsSummary: summaryText,
        notes: notes.trim() || null,
        photoUrl: photoUrl || undefined,
        date: new Date().toISOString().split("T")[0],
      });

      toast.success(
        t("symptoms.savedSuccess" as any) ||
          (isPt
            ? "Sintomas registados com sucesso!"
            : "Symptoms recorded successfully!"),
      );

      // Reset form
      setCheckedSymptoms(new Set());
      setNotes("");
      setSeverity("low");
      setPhotoUrl(null);
      setSearchQuery("");
    } catch (err) {
      console.error("[SymptomsPage] Failed to save symptoms:", err);
      toast.error(
        t("symptoms.saveError" as any) ||
          (isPt ? "Erro ao guardar sintomas." : "Failed to save symptoms."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingAnimals) {
    return <AppShellSkeleton mode="content" variant="health" />;
  }

  if (animals.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-4 pt-16 text-center space-y-4">
        <PawPrint className="w-16 h-16 text-muted-foreground mx-auto opacity-50 animate-pulse" />
        <h1 className="text-2xl font-bold text-foreground">
          {isPt ? "Sem Animais Registados" : "No Animals Registered"}
        </h1>
        <p className="text-muted-foreground max-w-sm mx-auto text-sm">
          {isPt
            ? "Adiciona um animal no Perfil antes de registar sintomas."
            : "Add a pet in Profile before logging symptoms."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pb-20 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <HeartPulse className="w-7 h-7 text-rose-500" />
            {t("symptoms.title" as any) ||
              (isPt
                ? "Checkup Holístico & Sintomas"
                : "Holistic Checkup & Symptoms")}
          </h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            {t("symptoms.subtitle" as any) ||
              (isPt
                ? "Avaliação clínica sistemática por categorias corporais para o acompanhamento do teu animal."
                : "Systematic clinical assessment across body categories for pet monitoring.")}
          </p>
        </div>
      </div>

      {/* Animal Selector */}
      {animals.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {animals.map((a) => {
            const isSelected = selectedAnimal?.id === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAnimalId(a.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-semibold whitespace-nowrap transition-all duration-200",
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                    : "bg-card border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <PawPrint size={14} />
                {a.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Checkup Form */}
      <Card className="bg-card border-border/80 shadow-md">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Plus size={14} className="text-primary" />
              {isPt ? "Novo Checkup Clínico" : "New Clinical Checkup"}
              {selectedAnimal && (
                <span className="text-primary font-bold normal-case">
                  — {selectedAnimal.name}
                </span>
              )}
            </span>

            {/* Accessibility Live Counter */}
            <span
              aria-live="polite"
              aria-atomic="true"
              className={cn(
                "text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                checkedSymptoms.size > 0
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                  : "bg-secondary text-muted-foreground border-border",
              )}
            >
              {checkedSymptoms.size === 0
                ? t("symptoms.selectedCount_zero" as any) ||
                  (isPt ? "Nenhum sintoma" : "No symptoms")
                : checkedSymptoms.size === 1
                  ? t("symptoms.selectedCount_one" as any) ||
                    (isPt ? "1 sintoma selecionado" : "1 symptom selected")
                  : (
                      t("symptoms.selectedCount_other" as any) ||
                      (isPt
                        ? "{{count}} sintomas selecionados"
                        : "{{count}} symptoms selected")
                    ).replace("{{count}}", String(checkedSymptoms.size))}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-6">
          {/* Search bar with category context */}
          <div className="space-y-2">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                id={searchInputId}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  t("symptoms.searchPlaceholder" as any) ||
                  (isPt
                    ? "Pesquisar sintoma ou categoria (ex: vómitos, pele, tosse...)"
                    : "Search symptom or category (e.g.: vomiting, skin, cough...)")
                }
                className="pl-9 pr-8 text-xs sm:text-sm bg-secondary/40 border-border rounded-xl"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  aria-label={
                    t("symptoms.clearSearch" as any) ||
                    (isPt ? "Limpar pesquisa" : "Clear search")
                  }
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Live Search Results Card */}
            {searchQuery.trim().length > 0 && (
              <div className="p-3 bg-secondary/40 border border-border/80 rounded-xl space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {isPt ? "Resultados da Pesquisa:" : "Search Results:"}
                </p>
                {searchResults.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    {(
                      t("symptoms.noSearchResults" as any) ||
                      (isPt
                        ? 'Nenhum sintoma encontrado para "{{query}}"'
                        : 'No symptoms found for "{{query}}"')
                    ).replace("{{query}}", searchQuery)}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {searchResults.map(({ symptom, category }) => {
                      const isChecked = checkedSymptoms.has(symptom.id);
                      const catTitle =
                        t(category.titleKey as any) ||
                        (isPt
                          ? category.fallbackTitlePt
                          : category.fallbackTitleEn);
                      const itemLabel =
                        t(symptom.labelKey as any) ||
                        (isPt
                          ? symptom.fallbackLabelPt
                          : symptom.fallbackLabelEn);

                      return (
                        <button
                          key={symptom.id}
                          type="button"
                          onClick={() => toggleSymptom(symptom.id)}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg border text-left text-xs transition-colors",
                            isChecked
                              ? "bg-rose-500/15 border-rose-500/40 text-foreground"
                              : "bg-background/80 border-border/80 text-foreground hover:bg-secondary",
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="text-base">{symptom.emoji}</span>
                            <div className="truncate">
                              <span className="font-semibold block truncate">
                                {itemLabel}
                              </span>
                              <span className="text-[10px] text-muted-foreground block truncate">
                                {category.emoji} {catTitle}
                              </span>
                            </div>
                          </div>
                          {isChecked && (
                            <CheckCircle2
                              size={14}
                              className="text-rose-500 flex-shrink-0"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Symptoms Chips Bar */}
          {checkedSymptoms.size > 0 && (
            <div className="space-y-2 p-3 bg-secondary/20 rounded-xl border border-border/70">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>
                  {t("symptoms.observedSymptoms" as any) ||
                    (isPt ? "Sintomas selecionados:" : "Selected symptoms:")}
                </span>
                <button
                  type="button"
                  onClick={() => setCheckedSymptoms(new Set())}
                  className="text-[11px] text-muted-foreground hover:text-red-400 transition-colors"
                >
                  {isPt ? "Limpar seleção" : "Clear all"}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {Array.from(checkedSymptoms).map((id) => {
                  const s = getSymptomByLegacyOrId(id);
                  const label = s
                    ? isPt
                      ? s.fallbackLabelPt
                      : s.fallbackLabelEn
                    : id;
                  const category = getCategoryForSymptom(id);

                  return (
                    <Badge
                      key={id}
                      variant="outline"
                      className="gap-1 bg-background/80 border-rose-500/40 text-foreground text-xs py-1 px-2.5 rounded-lg flex items-center"
                    >
                      <span>{s?.emoji ?? "🐾"}</span>
                      <span className="font-semibold">{label}</span>
                      {category && (
                        <span className="text-[10px] text-muted-foreground">
                          ({category.emoji})
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeSymptom(id)}
                        className="ml-1 text-muted-foreground hover:text-rose-400"
                        aria-label={`${isPt ? "Remover" : "Remove"} ${label}`}
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  );
                })}
              </div>

              {checkedSymptoms.size > 5 && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {t("symptoms.extraSymptomsNotice" as any) ||
                      (isPt
                        ? "Selecionaste mais de 5 sintomas. O resumo do boletim incluirá os principais, e todos os sintomas adicionais ficam integralmente registados no Modo Veterinário e na timeline clínica."
                        : "You selected more than 5 symptoms. The summary will include the primary ones, and all additional symptoms remain fully tracked in Veterinary Mode and the clinical timeline.")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Clinical Categories Accordions */}
          <div className="space-y-3">
            {SYMPTOM_CATEGORIES.map((cat) => {
              const categorySymptoms = ALL_SYMPTOMS.filter(
                (s) => s.categoryId === cat.id,
              );

              return (
                <SymptomCategoryAccordion
                  key={cat.id}
                  category={cat}
                  symptoms={categorySymptoms}
                  checkedSymptoms={checkedSymptoms}
                  onToggleSymptom={toggleSymptom}
                  isOpen={!!openCategories[cat.id]}
                  onToggleOpen={() => toggleCategoryOpen(cat.id)}
                />
              );
            })}
          </div>

          {/* Red Flag Clinical Alert Banner */}
          <AnimatePresence>
            {isRedFlagActive && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex gap-3 items-start shadow-sm"
              >
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1 text-left">
                  <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">
                    {t("symptoms.redFlagAlert.title" as any) ||
                      (isPt
                        ? "Atenção: Red Flag / Alerta de Urgência Clínica"
                        : "Warning: Red Flag / Clinical Emergency Alert")}
                  </h4>
                  <p className="text-xs text-red-300/90 leading-relaxed">
                    {t("symptoms.redFlagAlert.description" as any) ||
                      (isPt
                        ? "Foram detetados sintomas potencialmente críticos ou selecionada gravidade elevada. Se o teu animal apresentar dor aguda, convulsões ou dificuldade respiratória contínua, contacta de imediato um médico veterinário ou hospital 24h."
                        : "Potentially critical symptoms or high severity selected. If your pet shows acute pain, seizures, or persistent breathing difficulty, contact an emergency vet or 24h hospital immediately.")}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Severity Selector */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("symptoms.severityTitle" as any) ||
                (isPt
                  ? "Gravidade Clínica Geral:"
                  : "General Clinical Severity:")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["low", "medium", "high"] as SymptomSeverity[]).map((s) => {
                const cfg = SEVERITY_CONFIG[s];
                const isSelected = severity === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between",
                      isSelected
                        ? `${cfg.activeBorder} shadow-sm ring-1 ring-border`
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40",
                    )}
                  >
                    <span className="text-xs font-bold block">
                      {isPt ? cfg.labelPt : cfg.labelEn}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      {isPt ? cfg.descPt : cfg.descEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Photo Upload Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Camera size={14} className="text-primary" />
                {t("symptoms.photoSection.title" as any) ||
                  (isPt
                    ? "Registo Fotográfico (Opcional)"
                    : "Photo Record (Optional)")}
              </span>
              {hasVisualSymptomSelected && (
                <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                  <AlertCircle size={11} />
                  {isPt
                    ? "Sintomas visuais detetados"
                    : "Visual signs detected"}
                </span>
              )}
            </div>

            {hasVisualSymptomSelected && !photoUrl && (
              <p className="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl leading-relaxed">
                {t("symptoms.photoSection.visualCallout" as any) ||
                  (isPt
                    ? "Detetaste sinais visuais (pele/pelo/feridas). Podes anexar uma foto para avaliação veterinária mais precisa."
                    : "You noticed visual signs (skin/coat/wounds). You can attach a photo for a more accurate veterinary evaluation.")}
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoSelect}
              className="hidden"
              id="symptom-photo-input"
            />

            {photoUrl ? (
              <div className="relative inline-block border border-border rounded-2xl overflow-hidden bg-black/30 p-2 shadow-sm">
                <img
                  src={photoUrl}
                  alt={isPt ? "Foto do sintoma" : "Symptom photo"}
                  className="w-32 h-32 object-cover rounded-xl border border-white/10"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-3 right-3 bg-red-600/90 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition-colors"
                  aria-label={
                    t("symptoms.photoSection.remove" as any) ||
                    (isPt ? "Remover foto" : "Remove photo")
                  }
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressingPhoto}
                className="w-full sm:w-auto text-xs border-dashed border-border hover:border-primary/50 rounded-xl gap-2 h-10"
              >
                {isCompressingPhoto ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-primary" />
                    <span>
                      {t("symptoms.photoSection.uploading" as any) ||
                        (isPt
                          ? "A processar imagem..."
                          : "Processing image...")}
                    </span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={14} className="text-primary" />
                    <span>
                      {t("symptoms.photoSection.button" as any) ||
                        (isPt ? "Tirar / Anexar Foto" : "Take / Attach Photo")}
                    </span>
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Observations Notes */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("symptoms.notesTitle" as any) ||
                (isPt
                  ? "Observações Clínicas (Opcional):"
                  : "Clinical Observations (Optional):")}
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                t("symptoms.notesPlaceholder" as any) ||
                (isPt
                  ? "Ex: começou ontem à noite após a refeição, associado a alteração de ração..."
                  : "E.g.: started last night after eating, linked to food brand change...")
              }
              maxLength={500}
              rows={3}
              className="text-xs sm:text-sm bg-secondary/30 border-border resize-none rounded-xl"
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {notes.length}/500
            </p>
          </div>

          {/* Save Action */}
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || checkedSymptoms.size === 0}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl gap-2 py-3 shadow-md"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t("symptoms.saving" as any) ||
                  (isPt ? "A guardar..." : "Saving...")}
              </>
            ) : (
              <>
                <Plus size={16} />
                {t("symptoms.saveButton" as any) ||
                  (isPt ? "Guardar Checkup Clínico" : "Save Clinical Checkup")}
                {checkedSymptoms.size > 0 && (
                  <Badge className="ml-1 bg-white/20 text-white text-[10px]">
                    {checkedSymptoms.size}
                  </Badge>
                )}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* History of Symptoms */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <CalendarDays size={14} />
          {t("symptoms.historyTitle" as any) ||
            (isPt
              ? "Histórico Clínico de Sintomas"
              : "Clinical Symptom History")}
        </h2>

        {loadingRecords ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : symptomRecords.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground space-y-2 bg-card border border-border/80 rounded-2xl p-6">
            <ClipboardList className="w-10 h-10 mx-auto opacity-30 text-primary" />
            <p className="text-xs">
              {t("symptoms.noHistory" as any) ||
                (isPt
                  ? "Nenhum sintoma registado ainda."
                  : "No symptoms logged yet.")}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2.5">
              {symptomRecords.map((record) => {
                if (!record) return null;
                const sev = (record.result ?? "low") as SymptomSeverity;
                const cfg = SEVERITY_CONFIG[sev] ?? SEVERITY_CONFIG.low;

                return (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Card className="bg-card border-border/80 shadow-sm">
                      <CardContent className="p-3.5 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground">
                              {record.product || (isPt ? "Sintoma" : "Symptom")}
                            </span>
                            <Badge
                              className={cn(
                                "text-[10px] font-semibold border",
                                cfg.badgeClass,
                              )}
                            >
                              {isPt ? cfg.labelPt : cfg.labelEn}
                            </Badge>
                          </div>

                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(record.date).toLocaleDateString(
                              isPt ? "pt-PT" : "en-US",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </p>

                          {record.notes && (
                            <p className="text-xs text-foreground/80 mt-1.5 leading-relaxed">
                              {record.notes}
                            </p>
                          )}
                        </div>

                        {deleteRecordMutation && (
                          <button
                            type="button"
                            onClick={() =>
                              deleteRecordMutation.mutate({ id: record.id })
                            }
                            className="text-muted-foreground hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 flex-shrink-0"
                            title={
                              t("symptoms.delete" as any) ||
                              (isPt ? "Apagar" : "Delete")
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
