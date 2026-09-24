export type CareType = "feeding" | "medication" | "walk" | "hygiene" | "other";

export interface RoutineCareDefinition {
  id: string;
  careType: CareType;
  careSubtype: string;
  titleKey: string;
  fallbackTitlePt: string;
  fallbackTitleEn: string;
  emoji: string;
  suggestedPeriod: "morning" | "afternoon" | "evening" | "anytime";
}

export const ROUTINE_CARE_DEFINITIONS: RoutineCareDefinition[] = [
  {
    id: "feeding_breakfast",
    careType: "feeding",
    careSubtype: "breakfast",
    titleKey: "care.routine.breakfast",
    fallbackTitlePt: "Pequeno-almoço / Refeição da Manhã",
    fallbackTitleEn: "Breakfast / Morning Meal",
    emoji: "🥣",
    suggestedPeriod: "morning",
  },
  {
    id: "feeding_dinner",
    careType: "feeding",
    careSubtype: "dinner",
    titleKey: "care.routine.dinner",
    fallbackTitlePt: "Jantar / Refeição da Noite",
    fallbackTitleEn: "Dinner / Evening Meal",
    emoji: "🥣",
    suggestedPeriod: "evening",
  },
  {
    id: "walk_daily",
    careType: "walk",
    careSubtype: "daily_walk",
    titleKey: "care.routine.walk",
    fallbackTitlePt: "Passeio / Exercício Diário",
    fallbackTitleEn: "Daily Walk / Exercise",
    emoji: "🦮",
    suggestedPeriod: "anytime",
  },
  {
    id: "medication_scheduled",
    careType: "medication",
    careSubtype: "scheduled",
    titleKey: "care.routine.medication",
    fallbackTitlePt: "Medicação / Tratamento",
    fallbackTitleEn: "Medication / Treatment",
    emoji: "💊",
    suggestedPeriod: "anytime",
  },
  {
    id: "hygiene_grooming",
    careType: "hygiene",
    careSubtype: "grooming",
    titleKey: "care.routine.hygiene",
    fallbackTitlePt: "Higiene / Escovagem",
    fallbackTitleEn: "Hygiene / Grooming",
    emoji: "🧼",
    suggestedPeriod: "anytime",
  },
];

export interface CareLogEntry {
  id: number;
  animalId: number;
  userId: number;
  userName?: string;
  careType: CareType;
  careSubtype: string | null;
  title: string;
  notes: string | null;
  careDate: string; // 'YYYY-MM-DD'
  completedAt: string; // ISO string
}

export interface RoutineCareItemStatus {
  definition: RoutineCareDefinition;
  isCompleted: boolean;
  completedLog?: CareLogEntry;
}

export interface InformativeBioacousticStatus {
  hasRecordedToday: boolean;
  lastEventTime: string | null; // e.g. "14:25"
  state: string | null;
  emoji: string | null;
  confidence: number | null;
}

export interface DailyCareBoardData {
  animalId: number;
  careDate: string;
  timezone: string;
  completedCount: number;
  totalRoutineCount: number;
  routineItems: RoutineCareItemStatus[];
  customLogs: CareLogEntry[];
  bioacousticStatus: InformativeBioacousticStatus;
}

/**
 * Returns 'YYYY-MM-DD' formatted date for a specific IANA timezone safely.
 * Falls back to UTC if the timezone is invalid.
 */
export function getCareDateForTimezone(
  timezone = "Europe/Lisbon",
  date = new Date(),
): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch (_err) {
    // Fallback if timezone string is unknown
    const utcFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return utcFormatter.format(date);
  }
}
