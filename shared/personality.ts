// shared/personality.ts
// Shared types for the Personality Profile feature (Inspiração 5).
// Used by both server (inference + router) and client (radar, display).

/** The 5 behavioral dimensions. Order matters: it drives radar axis order. */
export const PERSONALITY_DIMENSIONS = [
  "vocalExpressiveness",
  "stressResilience",
  "energyLevel",
  "sociability",
  "independence",
] as const;

export type PersonalityDimension = (typeof PERSONALITY_DIMENSIONS)[number];

/** Score for a single dimension */
export interface DimensionScore {
  value: number; // 1–5
  confidence: number; // 0–1
}

/** Full personality profile as returned by the server */
export interface AnimalPersonality {
  animalId: number;
  vocalExpressiveness: number; // 1–5
  stressResilience: number; // 1–5
  energyLevel: number; // 1–5
  sociability: number; // 1–5
  independence: number; // 1–5
  confidence: number; // 0–1 overall
  source: "inferred" | "user" | "blended";
  eventsUsed: number;
  updatedAt: string; // ISO 8601
}

/** User override input for one or more dimensions */
export type PersonalityUserOverride = Partial<
  Record<PersonalityDimension, number>
>;

/** Display metadata for each dimension (i18n keys + visual config) */
export interface DimensionMeta {
  labelKey: string;
  fallbackPt: string;
  fallbackEn: string;
  descriptionKey: string;
  /** Axis color used in the SVG radar */
  colorVar: string;
  /** Emoji for quick display */
  emoji: string;
}

export const DIMENSION_META: Record<PersonalityDimension, DimensionMeta> = {
  vocalExpressiveness: {
    labelKey: "personality.dimensions.vocalExpressiveness",
    fallbackPt: "Expressividade Vocal",
    fallbackEn: "Vocal Expressiveness",
    descriptionKey: "personality.desc.vocalExpressiveness",
    colorVar: "var(--primary)",
    emoji: "🎵",
  },
  stressResilience: {
    labelKey: "personality.dimensions.stressResilience",
    fallbackPt: "Resiliência ao Stress",
    fallbackEn: "Stress Resilience",
    descriptionKey: "personality.desc.stressResilience",
    colorVar: "var(--secondary)",
    emoji: "🧘",
  },
  energyLevel: {
    labelKey: "personality.dimensions.energyLevel",
    fallbackPt: "Nível de Energia",
    fallbackEn: "Energy Level",
    descriptionKey: "personality.desc.energyLevel",
    colorVar: "var(--color-warning, #f59e0b)",
    emoji: "⚡",
  },
  sociability: {
    labelKey: "personality.dimensions.sociability",
    fallbackPt: "Sociabilidade",
    fallbackEn: "Sociability",
    descriptionKey: "personality.desc.sociability",
    colorVar: "var(--tertiary, #a78bfa)",
    emoji: "🤝",
  },
  independence: {
    labelKey: "personality.dimensions.independence",
    fallbackPt: "Independência",
    fallbackEn: "Independence",
    descriptionKey: "personality.desc.independence",
    colorVar: "var(--muted-foreground)",
    emoji: "🦅",
  },
};

/**
 * Default/neutral profile returned when no data is available yet.
 * confidence = 0 signals to the UI to show provisional state.
 */
export const DEFAULT_PERSONALITY: AnimalPersonality = {
  animalId: 0,
  vocalExpressiveness: 3,
  stressResilience: 3,
  energyLevel: 3,
  sociability: 3,
  independence: 3,
  confidence: 0,
  source: "inferred",
  eventsUsed: 0,
  updatedAt: new Date(0).toISOString(),
};

/** Minimum events before confidence is considered "meaningful" */
export const MIN_EVENTS_FOR_CONFIDENCE = 10;

/** Confidence threshold below which dimensions are shown as "provisional" */
export const PROVISIONAL_THRESHOLD = 0.4;
