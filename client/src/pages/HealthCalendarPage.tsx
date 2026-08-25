import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  type LucideIcon,
  PawPrint,
  Plus,
  Shield,
  Syringe,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

// ─── Types ─────────────────────────────────────────────────────────────────

type EventType = "vaccine" | "deworming" | "consultation" | "treatment";

const EVENT_CONFIG: Record<
  EventType,
  {
    labelPt: string;
    labelEn: string;
    icon: LucideIcon;
    color: string;
    dotColor: string;
  }
> = {
  vaccine: {
    labelPt: "Vacina",
    labelEn: "Vaccine",
    icon: Syringe,
    color: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300",
    dotColor: "bg-indigo-400",
  },
  deworming: {
    labelPt: "Desparasitação",
    labelEn: "Deworming",
    icon: Shield,
    color: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    dotColor: "bg-amber-400",
  },
  consultation: {
    labelPt: "Consulta",
    labelEn: "Consultation",
    icon: Heart,
    color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    dotColor: "bg-emerald-400",
  },
  treatment: {
    labelPt: "Tratamento",
    labelEn: "Treatment",
    icon: Plus,
    color: "bg-rose-500/15 border-rose-500/30 text-rose-300",
    dotColor: "bg-rose-400",
  },
};

// ─── Helper: calendar grid ──────────────────────────────────────────────────

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay + 6) % 7; // Monday first
  const days: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

const MONTH_NAMES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Event Dot ─────────────────────────────────────────────────────────────

function EventDot({ type }: { type: EventType }) {
  return (
    <span
      className={cn(
        "inline-block w-1.5 h-1.5 rounded-full",
        EVENT_CONFIG[type]?.dotColor ?? "bg-slate-400",
      )}
    />
  );
}

// ─── Add Event Modal ───────────────────────────────────────────────────────

interface AddEventModalProps {
  animalId: number;
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
  language: string;
}

function AddEventModal({
  animalId,
  defaultDate,
  onClose,
  onSaved,
  language,
}: AddEventModalProps) {
  const pt = language === "pt";
  const [eventType, setEventType] = useState<EventType>("consultation");
  const [product, setProduct] = useState("");
  const [date, setDate] = useState(
    defaultDate ?? new Date().toISOString().split("T")[0],
  );
  const [nextDue, setNextDue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const addMutation = trpc.health.addHealthRecord.useMutation();
  const addVaccineMutation = trpc.health.addVaccine.useMutation();
  const utils = trpc.useUtils();

  const handleSave = async () => {
    if (!product.trim()) {
      toast.error(
        pt ? "Preenche o nome do evento." : "Please enter an event name.",
      );
      return;
    }
    setSaving(true);
    try {
      if (eventType === "vaccine") {
        await addVaccineMutation.mutateAsync({
          animalId,
          vaccineName: product.trim(),
          vaccineType: "other",
          dateAdministered: date,
          nextDueDate: nextDue || null,
        });
      } else {
        await addMutation.mutateAsync({
          animalId,
          recordType:
            eventType === "deworming" ? "deworming" : "other_treatment",
          category: eventType === "consultation" ? "consultation" : eventType,
          product: product.trim(),
          date,
          nextDueDate: nextDue || null,
          notes: notes.trim() || null,
        });
      }
      utils.health.getHealthRecords.invalidate({ animalId });
      utils.health.getVaccines.invalidate({ animalId });
      toast.success(pt ? "Evento adicionado!" : "Event added!");
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(pt ? "Erro ao guardar evento." : "Failed to save event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-md space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">
            {pt ? "Adicionar Evento" : "Add Event"}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Type selector */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(EVENT_CONFIG) as EventType[]).map((t) => {
            const cfg = EVENT_CONFIG[t];
            const Icon = cfg.icon;
            return (
              <button
                key={t}
                onClick={() => setEventType(t)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all",
                  eventType === t
                    ? cfg.color
                    : "bg-card border-border text-muted-foreground",
                )}
              >
                <Icon size={12} />
                {pt ? cfg.labelPt : cfg.labelEn}
              </button>
            );
          })}
        </div>

        {/* Name */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            {pt ? "Nome / produto:" : "Name / product:"}
          </label>
          <Input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder={
              pt
                ? "Ex: Rabigen Mono, Frontline..."
                : "E.g. Rabigen Mono, Frontline..."
            }
            className="bg-slate-800/50 border-slate-700 text-sm"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {pt ? "Data:" : "Date:"}
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {pt ? "Próxima dose (opcional):" : "Next due (optional):"}
            </label>
            <Input
              type="date"
              value={nextDue}
              onChange={(e) => setNextDue(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-sm"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            {pt ? "Notas (opcional):" : "Notes (optional):"}
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={pt ? "Observações clínicas..." : "Clinical notes..."}
            rows={2}
            className="bg-slate-800/50 border-slate-700 text-sm resize-none"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin mr-2" />
          ) : (
            <Plus size={16} className="mr-2" />
          )}
          {pt ? "Guardar Evento" : "Save Event"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function HealthCalendarPage() {
  const { language } = useLanguage();
  const pt = language === "pt";

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data: animals = [], isLoading: loadingAnimals } =
    trpc.animals.list.useQuery();
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const selectedAnimal = selectedAnimalId
    ? animals.find((a) => a.id === selectedAnimalId)
    : (animals.find((a) => a.isActive) ?? animals[0]);

  const { data: healthRecords = [], isLoading: loadingRecords } =
    trpc.health.getHealthRecords.useQuery(
      { animalId: selectedAnimal?.id ?? 0 },
      { enabled: !!selectedAnimal },
    );
  const { data: vaccinations = [] } = trpc.health.getVaccines.useQuery(
    { animalId: selectedAnimal?.id ?? 0 },
    { enabled: !!selectedAnimal },
  );

  const utils = trpc.useUtils();

  // Build event map: key = "YYYY-MM-DD", value = EventType[]
  const eventMap: Record<string, EventType[]> = {};

  const addToMap = (dateStr: string | null | undefined, type: EventType) => {
    if (!dateStr) return;
    const key = dateStr.split("T")[0];
    if (!eventMap[key]) eventMap[key] = [];
    eventMap[key].push(type);
  };

  vaccinations.forEach((v) => {
    if (!v) return;
    addToMap(v.dateAdministered?.toString(), "vaccine");
    addToMap(v.nextDueDate?.toString(), "vaccine");
  });

  healthRecords.forEach((r) => {
    if (!r) return;
    if (r.recordType === "deworming") {
      addToMap(r.date?.toString(), "deworming");
      addToMap(r.nextDueDate?.toString(), "deworming");
    } else if (r.category === "consultation") {
      addToMap(r.date?.toString(), "consultation");
    } else {
      addToMap(r.date?.toString(), "treatment");
    }
  });

  const calDays = getCalendarDays(viewYear, viewMonth);
  const monthNames = pt ? MONTH_NAMES_PT : MONTH_NAMES_EN;
  const weekdays = pt ? WEEKDAYS_PT : WEEKDAYS_EN;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const selectedDateStr = selectedDay
    ? `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null;
  const selectedDayEvents = selectedDateStr
    ? (eventMap[selectedDateStr] ?? [])
    : [];

  // All upcoming events (nextDueDate in the future)
  const upcoming = [
    ...vaccinations
      .filter((v): v is NonNullable<typeof v> => !!v?.nextDueDate)
      .map((v) => ({
        label: v.vaccineName,
        date: new Date(v.nextDueDate!),
        type: "vaccine" as EventType,
      })),
    ...healthRecords
      .filter((r): r is NonNullable<typeof r> => !!r?.nextDueDate)
      .map((r) => ({
        label: r.product ?? (pt ? "Evento" : "Event"),
        date: new Date(r.nextDueDate!),
        type:
          r.recordType === "deworming"
            ? ("deworming" as EventType)
            : ("treatment" as EventType),
      })),
  ]
    .filter((e) => e.date > today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

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
            ? "Adicione um animal no Perfil antes de usar o calendário."
            : "Add a pet in Profile before using the calendar."}
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
            <CalendarDays className="w-8 h-8 text-indigo-400" />
            {pt ? "Calendário de Saúde" : "Health Calendar"}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {pt
              ? "Vacinas, consultas, desparasitações e tratamentos"
              : "Vaccines, consultations, dewormings and treatments"}
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          size="sm"
          className="gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl flex-shrink-0"
        >
          <Plus size={14} />
          {pt ? "Adicionar" : "Add"}
        </Button>
      </div>

      {/* Animal selector */}
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

      {/* Calendar Grid */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-white">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekdays.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-semibold text-muted-foreground py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-y-1">
            {calDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEvents = eventMap[dateKey] ?? [];
              const isToday =
                day === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear === today.getFullYear();
              const isSelected = selectedDay === day;

              return (
                <button
                  key={day}
                  onClick={() =>
                    setSelectedDay(day === selectedDay ? null : day)
                  }
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-xl py-1.5 text-xs font-medium transition-all duration-150",
                    isSelected
                      ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                      : isToday
                        ? "bg-slate-700/60 text-white ring-1 ring-indigo-500/40"
                        : "text-slate-300 hover:bg-slate-800/70",
                    dayEvents.length > 0 && !isSelected && "font-bold",
                  )}
                >
                  {day}
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 justify-center">
                      {Array.from(new Set(dayEvents))
                        .slice(0, 3)
                        .map((t, i) => (
                          <EventDot key={i} type={t} />
                        ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day events */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {selectedDay} {monthNames[viewMonth]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    {pt ? "Sem eventos neste dia." : "No events on this day."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents.map((type, i) => {
                      const cfg = EVENT_CONFIG[type];
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold",
                            cfg.color,
                          )}
                        >
                          <Icon size={13} />
                          {pt ? cfg.labelPt : cfg.labelEn}
                        </div>
                      );
                    })}
                  </div>
                )}
                <Button
                  size="sm"
                  onClick={() => setShowModal(true)}
                  variant="ghost"
                  className="mt-3 w-full text-indigo-400 hover:text-indigo-300 text-xs gap-1.5"
                >
                  <Plus size={13} />
                  {pt ? "Adicionar evento neste dia" : "Add event on this day"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upcoming events */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-400" />
            {pt ? "Próximos Eventos" : "Upcoming Events"}
          </h2>
          <div className="space-y-2">
            {upcoming.map((ev, i) => {
              const cfg = EVENT_CONFIG[ev.type];
              const Icon = cfg.icon;
              const daysLeft = Math.ceil(
                (ev.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
              );
              return (
                <Card key={i} className="bg-slate-900/40 border-slate-800/70">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl border", cfg.color)}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {ev.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {ev.date.toLocaleDateString(pt ? "pt-PT" : "en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0",
                        daysLeft <= 7
                          ? "bg-red-500/15 text-red-300"
                          : daysLeft <= 30
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-slate-700/50 text-slate-400",
                      )}
                    >
                      {daysLeft === 0
                        ? pt
                          ? "Hoje"
                          : "Today"
                        : daysLeft === 1
                          ? pt
                            ? "Amanhã"
                            : "Tomorrow"
                          : `${daysLeft}d`}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && selectedAnimal && (
          <AddEventModal
            animalId={selectedAnimal.id}
            defaultDate={selectedDateStr ?? undefined}
            language={language}
            onClose={() => setShowModal(false)}
            onSaved={() => {
              utils.health.getHealthRecords.invalidate({
                animalId: selectedAnimal.id,
              });
              utils.health.getVaccines.invalidate({
                animalId: selectedAnimal.id,
              });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
