import { CheckCircle2, HeartPulse, Plus, Trash2, Volume2 } from "lucide-react";
// biome-ignore lint/correctness/noUnusedImports: React needed for Vitest runtime JSX
import React, { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type {
  CareType,
  DailyCareBoardData,
  RoutineCareDefinition,
} from "../../../../shared/care";

export interface DailyCareBoardProps {
  animalId: number;
  animalName: string;
  isOwnerOrWriteAllowed?: boolean;
}

export interface DailyCareBoardContentProps {
  board?: DailyCareBoardData;
  animalName: string;
  isOwnerOrWriteAllowed?: boolean;
  onOpenLogModal: (routine?: RoutineCareDefinition) => void;
  onQuickMarkRoutine: (routine: RoutineCareDefinition) => void;
  onDeleteCare: (logId: number) => void;
  isMutating?: boolean;
}

export function DailyCareBoardContent({
  board,
  animalName,
  isOwnerOrWriteAllowed = true,
  onOpenLogModal,
  onQuickMarkRoutine,
  onDeleteCare,
  isMutating = false,
}: DailyCareBoardContentProps) {
  const { t, language } = useLanguage();
  const isPt = language === "pt";

  return (
    <div className="space-y-4">
      {/* Header with Title and Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/60">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-primary" />
            <span>
              {t("care.title" as any) ||
                (isPt ? "Quadro de Cuidados Diários" : "Daily Care Board")}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {(
              t("care.subtitle" as any) ||
              (isPt
                ? "Coordenação de tarefas para {{name}} entre co-tutores"
                : "Care coordination for {{name}} across co-guardians")
            ).replace("{{name}}", animalName)}
          </p>
        </div>

        {board && (
          <Badge
            variant="outline"
            className="text-xs px-3 py-1 font-semibold border-primary/30 bg-primary/10 text-primary w-fit"
          >
            {(
              t("care.completedOf" as any) ||
              (isPt
                ? "{{completed}} / {{total}} cuidados concluídos hoje"
                : "{{completed}} / {{total}} cares completed today")
            )
              .replace("{{completed}}", String(board.completedCount))
              .replace("{{total}}", String(board.totalRoutineCount))}
          </Badge>
        )}
      </div>

      {/* Informative Bioacoustic Status (Refinement 2: read-only status, NOT a checkable task) */}
      <div className="p-3.5 rounded-2xl bg-secondary/15 border border-border/70 flex items-start gap-3">
        <Volume2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5 min-w-0">
          <span className="font-semibold text-foreground block">
            {t("care.bioacousticTitle" as any) ||
              (isPt
                ? "Estado Sonoro de Hoje (Informativo)"
                : "Today's Audio Status (Informative)")}
          </span>
          {board?.bioacousticStatus.hasRecordedToday ? (
            <p className="text-muted-foreground">
              {(
                t("care.bioacousticRecorded" as any) ||
                (isPt
                  ? "Última vocalização analisada hoje às {{time}}:"
                  : "Last vocalization analyzed today at {{time}}:")
              ).replace(
                "{{time}}",
                board.bioacousticStatus.lastEventTime || "",
              )}{" "}
              <span className="font-medium text-foreground">
                {board.bioacousticStatus.emoji}{" "}
                {t(`states.${board.bioacousticStatus.state}` as any) ||
                  board.bioacousticStatus.state}
              </span>
            </p>
          ) : (
            <p className="text-muted-foreground italic">
              {t("care.bioacousticEmpty" as any) ||
                (isPt
                  ? "Ainda não foram analisadas vocalizações hoje."
                  : "No vocalizations analyzed yet today.")}
            </p>
          )}
        </div>
      </div>

      {/* Routine Care Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
          <span>
            {t("care.routineTitle" as any) ||
              (isPt ? "Rotina do Dia" : "Daily Routine")}
          </span>
          {isOwnerOrWriteAllowed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenLogModal()}
              className="h-7 text-xs text-primary hover:text-primary/80 gap-1 px-2"
            >
              <Plus size={13} />
              <span>
                {t("care.addCare" as any) ||
                  (isPt ? "Outro cuidado" : "Other care")}
              </span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {board?.routineItems.map(
            ({ definition, isCompleted, completedLog }) => {
              const title =
                t(definition.titleKey as any) ||
                (isPt
                  ? definition.fallbackTitlePt
                  : definition.fallbackTitleEn);

              return (
                <div
                  key={definition.id}
                  className={cn(
                    "p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-2.5",
                    isCompleted
                      ? "bg-primary/5 border-primary/30"
                      : "bg-card border-border/80 hover:border-border",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">
                        {definition.emoji}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-foreground block truncate">
                          {title}
                        </span>
                        {isCompleted && completedLog ? (
                          <span className="text-[11px] text-muted-foreground block truncate">
                            {(
                              t("care.doneBy" as any) ||
                              (isPt ? "Feito por {{user}}" : "Done by {{user}}")
                            ).replace(
                              "{{user}}",
                              completedLog.userName ||
                                (isPt ? "Membro da família" : "Family member"),
                            )}
                            {completedLog.completedAt && (
                              <>
                                {" "}
                                (
                                {new Date(
                                  completedLog.completedAt,
                                ).toLocaleTimeString(isPt ? "pt-PT" : "en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                )
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-500 font-medium block">
                            {t("care.pending" as any) ||
                              (isPt ? "Pendente hoje" : "Pending today")}
                          </span>
                        )}
                      </div>
                    </div>

                    {isCompleted ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] gap-1 px-2 py-0.5">
                          <CheckCircle2 size={11} />
                          <span>
                            {t("care.done" as any) || (isPt ? "Feito" : "Done")}
                          </span>
                        </Badge>
                        {isOwnerOrWriteAllowed && completedLog && (
                          <button
                            type="button"
                            onClick={() => onDeleteCare(completedLog.id)}
                            className="text-muted-foreground hover:text-red-400 p-1"
                            title={
                              t("care.removeLog" as any) ||
                              (isPt ? "Remover marcação" : "Remove log")
                            }
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ) : (
                      isOwnerOrWriteAllowed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onQuickMarkRoutine(definition)}
                          disabled={isMutating}
                          className="h-8 text-xs font-semibold rounded-xl border-primary/40 text-primary hover:bg-primary/10 active-scale"
                        >
                          {t("care.markDone" as any) ||
                            (isPt ? "Marcar" : "Mark done")}
                        </Button>
                      )
                    )}
                  </div>

                  {/* Show notes if any */}
                  {isCompleted && completedLog?.notes && (
                    <p className="text-[11px] text-muted-foreground bg-secondary/20 p-2 rounded-lg italic">
                      "{completedLog.notes}"
                    </p>
                  )}
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* Custom/Ad-hoc Care Logs for the Day */}
      {board?.customLogs && board.customLogs.length > 0 && (
        <div className="space-y-2 pt-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 block">
            {t("care.customTitle" as any) ||
              (isPt ? "Outros Cuidados de Hoje" : "Other Care Logged Today")}
          </span>

          <div className="space-y-2">
            {board.customLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-card border border-border/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate">
                      {log.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      — {log.userName} (
                      {new Date(log.completedAt).toLocaleTimeString(
                        isPt ? "pt-PT" : "en-US",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                      )
                    </span>
                  </div>
                  {log.notes && (
                    <p className="text-muted-foreground text-[11px] italic mt-0.5">
                      {log.notes}
                    </p>
                  )}
                </div>

                {isOwnerOrWriteAllowed && (
                  <button
                    type="button"
                    onClick={() => onDeleteCare(log.id)}
                    className="text-muted-foreground hover:text-red-400 p-1 shrink-0"
                    title={
                      t("care.removeLog" as any) ||
                      (isPt ? "Remover marcação" : "Remove log")
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DailyCareBoard({
  animalId,
  animalName,
  isOwnerOrWriteAllowed = true,
}: DailyCareBoardProps) {
  const { t, language } = useLanguage();
  const isPt = language === "pt";
  const userTimezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Lisbon";

  const utils = trpc.useUtils();

  const { data: board } = trpc.family.getCareBoard.useQuery(
    { animalId, timezone: userTimezone },
    { enabled: !!animalId },
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCareType, setSelectedCareType] = useState<CareType>("feeding");
  const [selectedSubtype, setSelectedSubtype] = useState<string | undefined>(
    undefined,
  );
  const [careTitle, setCareTitle] = useState("");
  const [careNotes, setCareNotes] = useState("");

  const logCareMutation = trpc.family.logCare.useMutation({
    onSuccess: () => {
      toast.success(
        t("care.successToast" as any) ||
          (isPt
            ? "Cuidado registado com sucesso!"
            : "Care logged successfully!"),
      );
      utils.family.getCareBoard.invalidate({ animalId });
      utils.family.getActivity.invalidate();
      setIsDialogOpen(false);
      setCareTitle("");
      setCareNotes("");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteCareMutation = trpc.family.deleteCareLog.useMutation({
    onSuccess: () => {
      toast.success(
        t("care.deleteToast" as any) ||
          (isPt ? "Registo de cuidado removido." : "Care log removed."),
      );
      utils.family.getCareBoard.invalidate({ animalId });
      utils.family.getActivity.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleOpenLogModal = (routine?: RoutineCareDefinition) => {
    if (routine) {
      setSelectedCareType(routine.careType);
      setSelectedSubtype(routine.careSubtype);
      setCareTitle(
        t(routine.titleKey as any) ||
          (isPt ? routine.fallbackTitlePt : routine.fallbackTitleEn),
      );
    } else {
      setSelectedCareType("other");
      setSelectedSubtype(undefined);
      setCareTitle("");
    }
    setCareNotes("");
    setIsDialogOpen(true);
  };

  const handleQuickMarkRoutine = (routine: RoutineCareDefinition) => {
    const title =
      t(routine.titleKey as any) ||
      (isPt ? routine.fallbackTitlePt : routine.fallbackTitleEn);

    logCareMutation.mutate({
      animalId,
      careType: routine.careType,
      careSubtype: routine.careSubtype,
      title,
      timezone: userTimezone,
    });
  };

  const handleSubmitCareLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!careTitle.trim()) return;

    logCareMutation.mutate({
      animalId,
      careType: selectedCareType,
      careSubtype: selectedSubtype,
      title: careTitle.trim(),
      notes: careNotes.trim() || undefined,
      timezone: userTimezone,
    });
  };

  return (
    <>
      <DailyCareBoardContent
        board={board}
        animalName={animalName}
        isOwnerOrWriteAllowed={isOwnerOrWriteAllowed}
        onOpenLogModal={handleOpenLogModal}
        onQuickMarkRoutine={handleQuickMarkRoutine}
        onDeleteCare={(logId) =>
          deleteCareMutation.mutate({
            logId,
            animalId,
          })
        }
        isMutating={logCareMutation.isPending || deleteCareMutation.isPending}
      />

      {/* Modal to log custom or detailed care */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-card border-border">
          <form onSubmit={handleSubmitCareLog} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                {t("care.dialogTitle" as any) ||
                  (isPt ? "Registar Cuidado Diário" : "Log Daily Care")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("care.dialogDesc" as any) ||
                  (isPt
                    ? "Assinala o cuidado concluído para manter a família informada."
                    : "Mark completed care to keep the co-guardians updated.")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  {t("care.careType" as any) ||
                    (isPt ? "Tipo de cuidado" : "Care type")}
                </label>
                <select
                  value={selectedCareType}
                  onChange={(e) =>
                    setSelectedCareType(e.target.value as CareType)
                  }
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="feeding">
                    {isPt ? "Alimentação" : "Feeding"}
                  </option>
                  <option value="walk">
                    {isPt ? "Passeio / Exercício" : "Walk / Exercise"}
                  </option>
                  <option value="medication">
                    {isPt ? "Medicação / Tratamento" : "Medication"}
                  </option>
                  <option value="hygiene">
                    {isPt ? "Higiene / Banho / Escovagem" : "Hygiene"}
                  </option>
                  <option value="other">
                    {isPt ? "Outro cuidado" : "Other"}
                  </option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  {t("care.titleLabel" as any) || (isPt ? "Título" : "Title")}
                </label>
                <Input
                  value={careTitle}
                  onChange={(e) => setCareTitle(e.target.value)}
                  placeholder={
                    isPt
                      ? "Ex: Pequeno-almoço, Medicamento das 14h..."
                      : "E.g. Breakfast, Medication..."
                  }
                  className="h-9 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  {t("care.notesLabel" as any) ||
                    (isPt
                      ? "Notas adicionais (opcional)"
                      : "Additional notes (optional)")}
                </label>
                <Textarea
                  value={careNotes}
                  onChange={(e) => setCareNotes(e.target.value)}
                  placeholder={
                    t("care.notesPlaceholder" as any) ||
                    (isPt
                      ? "Ex: Comeu 120g de ração com apetite normal..."
                      : "E.g. Ate 120g with regular appetite...")
                  }
                  rows={2}
                  className="rounded-xl text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl text-xs h-9"
              >
                {t("care.cancel" as any) || (isPt ? "Cancelar" : "Cancel")}
              </Button>
              <Button
                type="submit"
                disabled={!careTitle.trim() || logCareMutation.isPending}
                className="rounded-xl text-xs h-9 bg-primary text-primary-foreground font-semibold"
              >
                {logCareMutation.isPending
                  ? t("care.saving" as any) ||
                    (isPt ? "A guardar..." : "Saving...")
                  : t("care.saveButton" as any) || (isPt ? "Guardar" : "Save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
