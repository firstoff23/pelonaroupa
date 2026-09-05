import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Loader2,
  PawPrint,
  Plus,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

// ─── Symptom list ──────────────────────────────────────────────────────────
type Severity = "low" | "medium" | "high";

interface SymptomOption {
  id: string;
  labelPt: string;
  labelEn: string;
  emoji: string;
}

const SYMPTOM_OPTIONS: SymptomOption[] = [
  { id: "vomiting", labelPt: "Vómitos", labelEn: "Vomiting", emoji: "🤢" },
  { id: "diarrhea", labelPt: "Diarreia", labelEn: "Diarrhea", emoji: "💩" },
  {
    id: "lethargy",
    labelPt: "Letargia / Cansaço",
    labelEn: "Lethargy",
    emoji: "😴",
  },
  {
    id: "appetite_loss",
    labelPt: "Perda de apetite",
    labelEn: "Loss of appetite",
    emoji: "🍽️",
  },
  {
    id: "excessive_drinking",
    labelPt: "Beber excessivo",
    labelEn: "Excessive drinking",
    emoji: "💧",
  },
  {
    id: "scratching",
    labelPt: "Coceira / Prurido",
    labelEn: "Scratching / Itching",
    emoji: "🐾",
  },
  { id: "coughing", labelPt: "Tosse", labelEn: "Coughing", emoji: "😮‍💨" },
  { id: "sneezing", labelPt: "Espirros", labelEn: "Sneezing", emoji: "🤧" },
  {
    id: "limping",
    labelPt: "Claudicação / Mancar",
    labelEn: "Limping",
    emoji: "🦵",
  },
  {
    id: "eye_discharge",
    labelPt: "Corrimento ocular",
    labelEn: "Eye discharge",
    emoji: "👁️",
  },
  {
    id: "nasal_discharge",
    labelPt: "Corrimento nasal",
    labelEn: "Nasal discharge",
    emoji: "👃",
  },
  {
    id: "bloating",
    labelPt: "Barriga dilatada",
    labelEn: "Bloating",
    emoji: "🫁",
  },
  {
    id: "weight_loss",
    labelPt: "Perda de peso",
    labelEn: "Weight loss",
    emoji: "⚖️",
  },
  { id: "trembling", labelPt: "Tremores", labelEn: "Trembling", emoji: "🥶" },
  { id: "seizures", labelPt: "Convulsões", labelEn: "Seizures", emoji: "⚡" },
  {
    id: "blood_urine",
    labelPt: "Sangue na urina",
    labelEn: "Blood in urine",
    emoji: "🔴",
  },
  {
    id: "bad_breath",
    labelPt: "Mau hálito",
    labelEn: "Bad breath",
    emoji: "💨",
  },
  {
    id: "hair_loss",
    labelPt: "Queda de pelo",
    labelEn: "Hair loss",
    emoji: "🐱",
  },
];

const SEVERITY_CONFIG: Record<
  Severity,
  { labelPt: string; labelEn: string; color: string }
> = {
  low: {
    labelPt: "Leve",
    labelEn: "Mild",
    color: "text-tertiary border-tertiary/30 bg-tertiary/10",
  },
  medium: {
    labelPt: "Moderado",
    labelEn: "Moderate",
    color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  high: {
    labelPt: "Grave",
    labelEn: "Severe",
    color: "text-red-400 border-red-500/30 bg-red-500/10",
  },
};

// ─── Page ──────────────────────────────────────────────────────────────────
export default function SymptomsPage() {
  const { language } = useLanguage();
  const pt = language === "pt";

  const { data: animals = [], isLoading: loadingAnimals } =
    trpc.animals.list.useQuery();
  const utils = trpc.useUtils();

  const activeAnimal = animals.find((a) => a.isActive) ?? animals[0];
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const selectedAnimal = selectedAnimalId
    ? animals.find((a) => a.id === selectedAnimalId)
    : activeAnimal;

  // Form state
  const [checkedSymptoms, setCheckedSymptoms] = useState<Set<string>>(
    new Set(),
  );
  const [severity, setSeverity] = useState<Severity>("low");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Existing symptom records
  const { data: healthRecords = [], isLoading: loadingRecords } =
    trpc.health.getHealthRecords.useQuery(
      { animalId: selectedAnimal?.id ?? 0 },
      { enabled: !!selectedAnimal },
    );

  const symptomRecords = healthRecords.filter(
    (r) => r?.recordType === "notes" && r?.category === "symptom",
  );

  const addRecordMutation = trpc.health.addHealthRecord.useMutation({
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

  const toggleSymptom = (id: string) => {
    setCheckedSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedAnimal) {
      toast.error(
        pt ? "Seleciona um animal primeiro." : "Select an animal first.",
      );
      return;
    }
    if (checkedSymptoms.size === 0) {
      toast.error(
        pt
          ? "Seleciona pelo menos um sintoma."
          : "Select at least one symptom.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const selectedLabels = SYMPTOM_OPTIONS.filter((s) =>
        checkedSymptoms.has(s.id),
      )
        .map((s) => (pt ? s.labelPt : s.labelEn))
        .join(", ");

      await addRecordMutation.mutateAsync({
        animalId: selectedAnimal.id,
        recordType: "notes",
        category: "symptom",
        product: selectedLabels,
        result: severity,
        date: new Date().toISOString().split("T")[0],
        notes: notes.trim() || null,
      });

      toast.success(
        pt
          ? "Sintomas registados com sucesso!"
          : "Symptoms recorded successfully!",
      );
      setCheckedSymptoms(new Set());
      setNotes("");
      setSeverity("low");
    } catch (err) {
      console.error("Failed to save symptoms:", err);
      toast.error(
        pt ? "Erro ao guardar sintomas." : "Failed to save symptoms.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingAnimals)
    return <AppShellSkeleton mode="content" variant="health" />;

  if (animals.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-4 pt-16 text-center space-y-4">
        <PawPrint className="w-16 h-16 text-muted-foreground mx-auto opacity-50 animate-pulse" />
        <h1 className="text-2xl font-bold text-white">
          {pt ? "Sem Animais Registados" : "No Animals Registered"}
        </h1>
        <p className="text-slate-400 max-w-sm mx-auto">
          {pt
            ? "Adicione um animal no Perfil antes de registar sintomas."
            : "Add a pet in Profile before logging symptoms."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-rose-400" />
            {pt ? "Registo de Sintomas" : "Symptom Logger"}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {pt
              ? "Regista sintomas do teu animal para acompanhar o histórico clínico."
              : "Log your pet's symptoms to track clinical history."}
          </p>
        </div>
      </div>

      {/* Animal Selector */}
      {animals.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          {animals.map((a) => {
            const isSelected = selectedAnimal?.id === a.id;
            return (
              <button
                key={a.id}
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

      {/* Form */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Plus size={14} />
            {pt ? "Novo Registo" : "New Record"}
            {selectedAnimal && (
              <span className="text-primary font-bold normal-case">
                — {selectedAnimal.name}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Symptom checkboxes */}
          <div>
            <p className="text-xs text-muted-foreground mb-3">
              {pt ? "Sintomas observados:" : "Observed symptoms:"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SYMPTOM_OPTIONS.map((s) => {
                const checked = checkedSymptoms.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSymptom(s.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-xs font-medium transition-all duration-150",
                      checked
                        ? "bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-sm"
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80",
                    )}
                  >
                    <span className="text-base leading-none flex-shrink-0">
                      {s.emoji}
                    </span>
                    <span className="truncate">
                      {pt ? s.labelPt : s.labelEn}
                    </span>
                    {checked && (
                      <CheckCircle2
                        size={12}
                        className="ml-auto text-rose-400 flex-shrink-0"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {pt ? "Severidade:" : "Severity:"}
            </p>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as Severity[]).map((s) => {
                const cfg = SEVERITY_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setSeverity(s)}
                    className={cn(
                      "flex-1 py-2 rounded-xl border text-xs font-semibold transition-all duration-150",
                      severity === s
                        ? cfg.color + " shadow-sm scale-105"
                        : "bg-card border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {pt ? cfg.labelPt : cfg.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {pt ? "Observações (opcional):" : "Notes (optional):"}
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                pt
                  ? "Ex: começou ontem à noite, associado a novo alimento..."
                  : "E.g.: started last night, related to new food..."
              }
              maxLength={500}
              rows={3}
              className="text-sm bg-slate-800/50 border-slate-700 resize-none"
            />
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || checkedSymptoms.size === 0}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {pt ? "A guardar..." : "Saving..."}
              </>
            ) : (
              <>
                <Plus size={16} />
                {pt ? "Guardar Sintomas" : "Save Symptoms"}
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

      {/* History */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <CalendarDays size={14} />
          {pt ? "Histórico de Sintomas" : "Symptom History"}
        </h2>

        {loadingRecords ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : symptomRecords.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground space-y-2">
            <ClipboardList className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm">
              {pt
                ? "Nenhum sintoma registado ainda."
                : "No symptoms logged yet."}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {symptomRecords.map((record) => {
                if (!record) return null;
                const sev = (record.result ?? "low") as Severity;
                const cfg = SEVERITY_CONFIG[sev] ?? SEVERITY_CONFIG.low;
                return (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Card className="bg-slate-900/40 border-slate-800/70">
                      <CardContent className="p-3 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {record.product || (pt ? "Sintoma" : "Symptom")}
                            </span>
                            <Badge
                              className={cn(
                                "text-[10px] font-semibold border",
                                cfg.color,
                              )}
                            >
                              {pt ? cfg.labelPt : cfg.labelEn}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(record.date).toLocaleDateString(
                              pt ? "pt-PT" : "en-US",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </p>
                          {record.notes && (
                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                              {record.notes}
                            </p>
                          )}
                        </div>
                        {deleteRecordMutation && (
                          <button
                            onClick={() =>
                              deleteRecordMutation.mutate({ id: record.id })
                            }
                            className="text-muted-foreground hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10 flex-shrink-0"
                            title={pt ? "Apagar" : "Delete"}
                          >
                            <Trash2 size={13} />
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
