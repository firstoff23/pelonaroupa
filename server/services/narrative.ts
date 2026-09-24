import type { EmotionalState } from "../../shared/types";
import { STATE_LABELS } from "../../shared/types";

export type PeriodOfDay = "morning" | "afternoon" | "night";

export type NarrativeTrend =
  | "improving"
  | "stable"
  | "concerning"
  | "insufficient_data";

export type RecommendationType =
  | "vet_consult"
  | "continue_monitoring"
  | "positive_routine"
  | "record_more";

export interface RawClassificationEvent {
  id?: number;
  state: string;
  confidence?: number;
  created_at: string | Date;
}

export interface WeeklyNarrativeStructured {
  animalId: number;
  animalName: string;
  periodDays: number;
  totalRecordings: number;
  hasSufficientData: boolean;
  dominantState: EmotionalState | null;
  dominantPercentage: number;
  distressCount: number;
  distressPercentage: number;
  relaxedPercentage: number;
  attentionPercentage: number;
  predominantDistressPeriod: PeriodOfDay | null;
  trend: NarrativeTrend;
  recommendationType: RecommendationType;
  recommendationThresholdDays: number;
  templateKey:
    | "night_distress"
    | "frequent_distress"
    | "mostly_relaxed"
    | "balanced_routine"
    | "insufficient_data";
  templateParams: {
    animalName: string;
    dominantPercentage: number;
    dominantState: string;
    dominantStateEn: string;
    distressCount: number;
    distressPercentage: number;
    relaxedPercentage: number;
    periodOfDay?: PeriodOfDay;
    daysCount: number;
  };
  fallbackNarrative: {
    pt: string;
    en: string;
  };
  cachedAt: string;
}

const STATE_LABELS_EN: Record<EmotionalState, string> = {
  distress: "Distressed",
  attention: "Attentive",
  excitement: "Excited",
  hunger: "Hungry",
  alert: "Alert",
  relaxed: "Relaxed",
};

export function getHourInTimezone(date: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const formatted = formatter.format(date);
    const hour = parseInt(formatted, 10);
    return Number.isNaN(hour) ? date.getUTCHours() : hour % 24;
  } catch {
    return date.getUTCHours();
  }
}

export function classifyHourToPeriod(hour: number): PeriodOfDay {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 20) return "afternoon";
  return "night";
}

/**
 * Pure function that analyzes classification events for an animal and returns
 * a structured weekly narrative.
 */
export function calculateWeeklyNarrative(params: {
  animalId: number;
  animalName: string;
  events: RawClassificationEvent[];
  timezone?: string;
  periodDays?: number;
  now?: Date;
}): WeeklyNarrativeStructured {
  const {
    animalId,
    animalName,
    events,
    timezone = "Europe/Lisbon",
    periodDays = 7,
    now = new Date(),
  } = params;

  const cutoffMs = now.getTime() - periodDays * 24 * 60 * 60 * 1000;
  const filteredEvents = events.filter((e) => {
    const time = new Date(e.created_at).getTime();
    return time >= cutoffMs && time <= now.getTime();
  });

  const totalRecordings = filteredEvents.length;
  const cachedAt = now.toISOString();

  // Insufficient data (< 3 events)
  if (totalRecordings < 3) {
    return {
      animalId,
      animalName,
      periodDays,
      totalRecordings,
      hasSufficientData: false,
      dominantState: null,
      dominantPercentage: 0,
      distressCount: 0,
      distressPercentage: 0,
      relaxedPercentage: 0,
      attentionPercentage: 0,
      predominantDistressPeriod: null,
      trend: "insufficient_data",
      recommendationType: "record_more",
      recommendationThresholdDays: 5,
      templateKey: "insufficient_data",
      templateParams: {
        animalName,
        dominantPercentage: 0,
        dominantState: "",
        dominantStateEn: "",
        distressCount: 0,
        distressPercentage: 0,
        relaxedPercentage: 0,
        daysCount: periodDays,
      },
      fallbackNarrative: {
        pt: `O ${animalName} tem apenas ${totalRecordings} registo(s) nesta semana. Regista mais vocalizações para desbloquear a análise narrativa semanal.`,
        en: `${animalName} only has ${totalRecordings} recording(s) this week. Record more vocalizations to unlock weekly narrative insights.`,
      },
      cachedAt,
    };
  }

  // Count states and periods
  const counts: Record<EmotionalState, number> = {
    distress: 0,
    attention: 0,
    excitement: 0,
    hunger: 0,
    alert: 0,
    relaxed: 0,
  };

  const distressByPeriod: Record<PeriodOfDay, number> = {
    morning: 0,
    afternoon: 0,
    night: 0,
  };

  for (const ev of filteredEvents) {
    const state = ev.state as EmotionalState;
    if (state in counts) {
      counts[state]++;
    }
    if (state === "distress") {
      const evDate = new Date(ev.created_at);
      const hour = getHourInTimezone(evDate, timezone);
      const period = classifyHourToPeriod(hour);
      distressByPeriod[period]++;
    }
  }

  // Calculate dominant state
  let dominantState: EmotionalState = "relaxed";
  let maxCount = -1;
  (Object.keys(counts) as EmotionalState[]).forEach((s) => {
    if (counts[s] > maxCount) {
      maxCount = counts[s];
      dominantState = s;
    }
  });

  const dominantPercentage = Math.round((maxCount / totalRecordings) * 100);
  const distressCount = counts.distress;
  const distressPercentage = Math.round(
    (distressCount / totalRecordings) * 100,
  );
  const relaxedPercentage = Math.round(
    (counts.relaxed / totalRecordings) * 100,
  );
  const attentionPercentage = Math.round(
    (counts.attention / totalRecordings) * 100,
  );

  // Determine predominant distress period
  let predominantDistressPeriod: PeriodOfDay | null = null;
  if (distressCount > 0) {
    let maxDistressPeriodCount = 0;
    (Object.keys(distressByPeriod) as PeriodOfDay[]).forEach((p) => {
      if (distressByPeriod[p] > maxDistressPeriodCount) {
        maxDistressPeriodCount = distressByPeriod[p];
        predominantDistressPeriod = p;
      }
    });
  }

  // Calculate trend comparing first half vs second half of the period
  const midCutoffMs = now.getTime() - (periodDays / 2) * 24 * 60 * 60 * 1000;
  const olderEvents = filteredEvents.filter(
    (e) => new Date(e.created_at).getTime() < midCutoffMs,
  );
  const recentEvents = filteredEvents.filter(
    (e) => new Date(e.created_at).getTime() >= midCutoffMs,
  );

  let trend: NarrativeTrend = "stable";
  if (olderEvents.length > 0 && recentEvents.length > 0) {
    const olderDistressRate =
      olderEvents.filter((e) => e.state === "distress").length /
      olderEvents.length;
    const recentDistressRate =
      recentEvents.filter((e) => e.state === "distress").length /
      recentEvents.length;

    if (recentDistressRate < olderDistressRate - 0.15) {
      trend = "improving";
    } else if (recentDistressRate > olderDistressRate + 0.15) {
      trend = "concerning";
    }
  }

  const dominantLabelPt =
    STATE_LABELS[dominantState]?.toLowerCase() || dominantState;
  const dominantLabelEn =
    STATE_LABELS_EN[dominantState]?.toLowerCase() || dominantState;

  // Rule resolution
  let templateKey:
    | "night_distress"
    | "frequent_distress"
    | "mostly_relaxed"
    | "balanced_routine";
  let recommendationType: RecommendationType;
  let ptNarrative = "";
  let enNarrative = "";

  if (
    distressCount >= 3 &&
    predominantDistressPeriod === "night" &&
    distressByPeriod.night >= 2
  ) {
    templateKey = "night_distress";
    recommendationType = "vet_consult";
    ptNarrative = `O ${animalName} esteve maioritariamente ${dominantLabelPt} (${dominantPercentage}%) esta semana. Detetei ${distressCount} momentos de angústia, sobretudo à noite, o que pode estar associado a desconforto ou novo ambiente. Continua a monitorizar — se persistir mais de 5 dias, considera falar com o veterinário.`;
    enNarrative = `${animalName} was mostly ${dominantLabelEn} (${dominantPercentage}%) this week. I detected ${distressCount} moments of distress, mostly at night, which may be associated with discomfort or environment change. Keep monitoring — if it persists for more than 5 days, consider consulting a veterinarian.`;
  } else if (distressPercentage > 30 || distressCount >= 3) {
    templateKey = "frequent_distress";
    recommendationType = "vet_consult";
    ptNarrative = `Detetei ${distressCount} episódios de angústia em ${animalName} (${distressPercentage}% das gravações). Continua a monitorizar com atenção — se os episódios se mantiverem por mais de 5 dias, consulta o teu veterinário.`;
    enNarrative = `I detected ${distressCount} distress episodes in ${animalName} (${distressPercentage}% of recordings). Keep monitoring closely — if episodes continue for more than 5 days, consult your veterinarian.`;
  } else if (relaxedPercentage >= 60) {
    templateKey = "mostly_relaxed";
    recommendationType = "positive_routine";
    ptNarrative = `O ${animalName} esteve maioritariamente relaxado (${relaxedPercentage}%) esta semana! Os registos demonstram consistência e bem-estar na rotina diária.`;
    enNarrative = `${animalName} was mostly relaxed (${relaxedPercentage}%) this week! Recordings demonstrate consistency and well-being in their daily routine.`;
  } else {
    templateKey = "balanced_routine";
    recommendationType = "continue_monitoring";
    ptNarrative = `O ${animalName} apresentou um comportamento equilibrado nesta semana, com predominância de estado ${dominantLabelPt} (${dominantPercentage}%). Mantém as gravações regulares para continuar o acompanhamento.`;
    enNarrative = `${animalName} displayed balanced behavior this week, with ${dominantLabelEn} (${dominantPercentage}%) as the most frequent state. Maintain regular recordings to continue tracking.`;
  }

  return {
    animalId,
    animalName,
    periodDays,
    totalRecordings,
    hasSufficientData: true,
    dominantState,
    dominantPercentage,
    distressCount,
    distressPercentage,
    relaxedPercentage,
    attentionPercentage,
    predominantDistressPeriod,
    trend,
    recommendationType,
    recommendationThresholdDays: 5,
    templateKey,
    templateParams: {
      animalName,
      dominantPercentage,
      dominantState: dominantLabelPt,
      dominantStateEn: dominantLabelEn,
      distressCount,
      distressPercentage,
      relaxedPercentage,
      periodOfDay: predominantDistressPeriod ?? undefined,
      daysCount: periodDays,
    },
    fallbackNarrative: {
      pt: ptNarrative,
      en: enNarrative,
    },
    cachedAt,
  };
}

// ─── Daily in-memory cache ───────────────────────────────────────────────────

interface CacheEntry {
  data: WeeklyNarrativeStructured;
  expiresAt: number;
}

const narrativeCache = new Map<string, CacheEntry>();

export function buildNarrativeCacheKey(
  animalId: number,
  now: Date = new Date(),
  timezone = "Europe/Lisbon",
): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return `${animalId}:${formatter.format(now)}`;
  } catch {
    return `${animalId}:${now.toISOString().slice(0, 10)}`;
  }
}

export function getCachedNarrative(
  cacheKey: string,
): WeeklyNarrativeStructured | null {
  const entry = narrativeCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    narrativeCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

export function setCachedNarrative(
  cacheKey: string,
  data: WeeklyNarrativeStructured,
  ttlMs = 24 * 60 * 60 * 1000,
): void {
  narrativeCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export function clearNarrativeCache(animalId?: number): void {
  if (animalId) {
    narrativeCache.forEach((_, key) => {
      if (key.startsWith(`${animalId}:`)) {
        narrativeCache.delete(key);
      }
    });
  } else {
    narrativeCache.clear();
  }
}
