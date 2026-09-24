import type { EmotionalState } from "../../../../shared/types";

export type CompanionStateId =
  | "calm"
  | "curious"
  | "attentive"
  | "alert"
  | "hungry"
  | "worried"
  | "sleeping";

export interface CompanionStateConfig {
  id: CompanionStateId;
  labelKey: string;
  fallbackLabelPt: string;
  fallbackLabelEn: string;
  descriptionKey: string;
  ariaLabelKey: string;
  colorVar: string;
  badgeClass: string;
  threshold: number; // percentage threshold (0.0 to 1.0)
  targetState?: EmotionalState;
}

export const COMPANION_STATES: Record<CompanionStateId, CompanionStateConfig> =
  {
    calm: {
      id: "calm",
      labelKey: "companion.states.calm",
      fallbackLabelPt: "Calmo",
      fallbackLabelEn: "Calm",
      descriptionKey: "companion.descriptions.calm",
      ariaLabelKey: "companion.ariaLabels.calm",
      colorVar: "var(--primary)",
      badgeClass: "bg-primary/10 text-primary border-primary/30",
      threshold: 0.5,
      targetState: "relaxed",
    },
    curious: {
      id: "curious",
      labelKey: "companion.states.curious",
      fallbackLabelPt: "Curioso",
      fallbackLabelEn: "Curious",
      descriptionKey: "companion.descriptions.curious",
      ariaLabelKey: "companion.ariaLabels.curious",
      colorVar: "var(--secondary)",
      badgeClass: "bg-secondary/15 text-secondary border-secondary/30",
      threshold: 0.4,
      targetState: "excitement",
    },
    attentive: {
      id: "attentive",
      labelKey: "companion.states.attentive",
      fallbackLabelPt: "Vigilante",
      fallbackLabelEn: "Attentive",
      descriptionKey: "companion.descriptions.attentive",
      ariaLabelKey: "companion.ariaLabels.attentive",
      colorVar: "var(--tertiary)",
      badgeClass: "bg-accent/20 text-foreground border-border",
      threshold: 0.4,
      targetState: "attention",
    },
    alert: {
      id: "alert",
      labelKey: "companion.states.alert",
      fallbackLabelPt: "Alerta",
      fallbackLabelEn: "Alert",
      descriptionKey: "companion.descriptions.alert",
      ariaLabelKey: "companion.ariaLabels.alert",
      colorVar: "var(--color-warning)",
      badgeClass: "bg-amber-500/15 text-amber-500 border-amber-500/30",
      threshold: 0.4,
      targetState: "alert",
    },
    hungry: {
      id: "hungry",
      labelKey: "companion.states.hungry",
      fallbackLabelPt: "Faminto",
      fallbackLabelEn: "Hungry",
      descriptionKey: "companion.descriptions.hungry",
      ariaLabelKey: "companion.ariaLabels.hungry",
      colorVar: "var(--primary)",
      badgeClass: "bg-primary/15 text-primary border-primary/30",
      threshold: 0.4,
      targetState: "hunger",
    },
    worried: {
      id: "worried",
      labelKey: "companion.states.worried",
      fallbackLabelPt: "Preocupado",
      fallbackLabelEn: "Worried",
      descriptionKey: "companion.descriptions.worried",
      ariaLabelKey: "companion.ariaLabels.worried",
      colorVar: "var(--destructive)",
      badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
      threshold: 0.3,
      targetState: "distress",
    },
    sleeping: {
      id: "sleeping",
      labelKey: "companion.states.sleeping",
      fallbackLabelPt: "A descansar",
      fallbackLabelEn: "Resting",
      descriptionKey: "companion.descriptions.sleeping",
      ariaLabelKey: "companion.ariaLabels.sleeping",
      colorVar: "var(--muted-foreground)",
      badgeClass: "bg-muted text-muted-foreground border-border",
      threshold: 0,
    },
  };

// Clinical priority order when resolving ties between emotional states
const CLINICAL_TIE_PRIORITY: Record<EmotionalState, number> = {
  distress: 6,
  alert: 5,
  hunger: 4,
  attention: 3,
  excitement: 2,
  relaxed: 1,
};

export interface CompanionResolution {
  stateId: CompanionStateId;
  config: CompanionStateConfig;
  percentage: number; // 0 to 100
  dominantEmotionalState: EmotionalState | null;
  totalEvents: number;
}

/**
 * Resolves the emotional companion state from the 7-day emotional distribution.
 *
 * Rules:
 * 1. If total events < 3 -> Returns "sleeping" (insufficient data to make clinical judgment).
 * 2. Checks thresholds:
 *    - distress >= 30% -> worried
 *    - alert >= 40% -> alert
 *    - hunger >= 40% -> hungry
 *    - attention >= 40% -> attentive
 *    - excitement >= 40% -> curious
 *    - relaxed >= 50% -> calm
 * 3. Ties or multiple candidates are resolved by:
 *    a) Highest percentage
 *    b) Clinical concern priority: distress > alert > hunger > attention > excitement > relaxed
 * 4. If no single state crosses its threshold, falls back to the highest percentage state.
 */
export function resolveCompanionState(
  distribution: Record<string, number> | undefined,
  explicitTotalCount?: number,
): CompanionResolution {
  if (!distribution) {
    return {
      stateId: "sleeping",
      config: COMPANION_STATES.sleeping,
      percentage: 0,
      dominantEmotionalState: null,
      totalEvents: 0,
    };
  }

  // Filter only standard emotional states
  const validStates: EmotionalState[] = [
    "distress",
    "alert",
    "hunger",
    "attention",
    "excitement",
    "relaxed",
  ];

  let calculatedTotal = 0;
  validStates.forEach((st) => {
    calculatedTotal += Number(distribution[st] || 0);
  });

  const totalEvents =
    typeof explicitTotalCount === "number" && explicitTotalCount > 0
      ? explicitTotalCount
      : calculatedTotal;

  // Rule 1: Insufficient records (< 3)
  if (totalEvents < 3 || calculatedTotal === 0) {
    return {
      stateId: "sleeping",
      config: COMPANION_STATES.sleeping,
      percentage: 0,
      dominantEmotionalState: null,
      totalEvents,
    };
  }

  // Calculate percentages
  const candidates: Array<{
    companionId: CompanionStateId;
    state: EmotionalState;
    percentage: number;
    crossesThreshold: boolean;
    clinicalPriority: number;
  }> = [
    {
      companionId: "worried",
      state: "distress",
      percentage: (Number(distribution.distress || 0) / calculatedTotal) * 100,
      crossesThreshold:
        Number(distribution.distress || 0) / calculatedTotal >=
        COMPANION_STATES.worried.threshold,
      clinicalPriority: CLINICAL_TIE_PRIORITY.distress,
    },
    {
      companionId: "alert",
      state: "alert",
      percentage: (Number(distribution.alert || 0) / calculatedTotal) * 100,
      crossesThreshold:
        Number(distribution.alert || 0) / calculatedTotal >=
        COMPANION_STATES.alert.threshold,
      clinicalPriority: CLINICAL_TIE_PRIORITY.alert,
    },
    {
      companionId: "hungry",
      state: "hunger",
      percentage: (Number(distribution.hunger || 0) / calculatedTotal) * 100,
      crossesThreshold:
        Number(distribution.hunger || 0) / calculatedTotal >=
        COMPANION_STATES.hungry.threshold,
      clinicalPriority: CLINICAL_TIE_PRIORITY.hunger,
    },
    {
      companionId: "attentive",
      state: "attention",
      percentage: (Number(distribution.attention || 0) / calculatedTotal) * 100,
      crossesThreshold:
        Number(distribution.attention || 0) / calculatedTotal >=
        COMPANION_STATES.attentive.threshold,
      clinicalPriority: CLINICAL_TIE_PRIORITY.attention,
    },
    {
      companionId: "curious",
      state: "excitement",
      percentage:
        (Number(distribution.excitement || 0) / calculatedTotal) * 100,
      crossesThreshold:
        Number(distribution.excitement || 0) / calculatedTotal >=
        COMPANION_STATES.curious.threshold,
      clinicalPriority: CLINICAL_TIE_PRIORITY.excitement,
    },
    {
      companionId: "calm",
      state: "relaxed",
      percentage: (Number(distribution.relaxed || 0) / calculatedTotal) * 100,
      crossesThreshold:
        Number(distribution.relaxed || 0) / calculatedTotal >=
        COMPANION_STATES.calm.threshold,
      clinicalPriority: CLINICAL_TIE_PRIORITY.relaxed,
    },
  ];

  // Eligible threshold candidates
  const eligible = candidates.filter((c) => c.crossesThreshold);

  if (eligible.length > 0) {
    // Sort by highest percentage, then clinical tie priority
    eligible.sort((a, b) => {
      const diff = b.percentage - a.percentage;
      if (Math.abs(diff) > 0.01) return diff;
      return b.clinicalPriority - a.clinicalPriority;
    });

    const chosen = eligible[0];
    return {
      stateId: chosen.companionId,
      config: COMPANION_STATES[chosen.companionId],
      percentage: Math.round(chosen.percentage),
      dominantEmotionalState: chosen.state,
      totalEvents,
    };
  }

  // Fallback if none crosses individual threshold: sort all candidates by percentage
  candidates.sort((a, b) => {
    const diff = b.percentage - a.percentage;
    if (Math.abs(diff) > 0.01) return diff;
    return b.clinicalPriority - a.clinicalPriority;
  });

  const fallback = candidates[0];
  return {
    stateId: fallback.companionId,
    config: COMPANION_STATES[fallback.companionId],
    percentage: Math.round(fallback.percentage),
    dominantEmotionalState: fallback.state,
    totalEvents,
  };
}
