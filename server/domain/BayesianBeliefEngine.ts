import type { EmotionalState } from "../../shared/types";

export interface BeliefState {
  relaxed: number;
  excitement: number;
  distress: number;
  hunger: number;
  alert: number;
  attention: number;
  updatedAt: string;
}

export type AlertSensitivity = "low" | "medium" | "high";

export interface UpdateBeliefOptions {
  observedState: EmotionalState;
  confidence: number;
  alertSensitivity?: AlertSensitivity;
  baselineFrequency?: number;
  sampleSize?: number;
}

export const STATES_LIST: readonly EmotionalState[] = [
  "relaxed",
  "excitement",
  "distress",
  "hunger",
  "alert",
  "attention",
] as const;

export const DEFAULT_BELIEF: Readonly<Omit<BeliefState, "updatedAt">> = {
  relaxed: 0.5,
  excitement: 0.1,
  distress: 0.1,
  hunger: 0.1,
  alert: 0.1,
  attention: 0.1,
};

/**
 * Motor de Inferência Bayesiana e POMDP (Partially Observable Markov Decision Process).
 *
 * Aplicação das UCs:
 * - Matemática: Álgebra linear (vetores estocásticos), Teoria das Probabilidades (Teorema de Bayes),
 *   funções de decaimento exponencial contínuo.
 * - Programação Orientada por Objetos: Encapsulamento de invariantes, imutabilidade, métodos de domínio puros.
 * - Algoritmia e Estruturas de Dados: Complexidade estrita O(|S|), onde |S| = 6 estados emocionais.
 */
export class BayesianBeliefEngine {
  private readonly defaultPrior: Readonly<Omit<BeliefState, "updatedAt">>;
  private readonly decayHalfLifeMinutes: number;

  constructor(defaultPrior = DEFAULT_BELIEF, decayHalfLifeMinutes = 30) {
    this.defaultPrior = defaultPrior;
    this.decayHalfLifeMinutes = decayHalfLifeMinutes;
  }

  /**
   * Retorna o estado a priori padrão com o carimbo temporal atual.
   */
  public getDefaultBelief(timestamp = new Date().toISOString()): BeliefState {
    return {
      ...this.defaultPrior,
      updatedAt: timestamp,
    };
  }

  /**
   * Normaliza um vetor de probabilidades garantindo que a soma é exatamente 1.0 (fecho estocástico).
   *
   * Fórmula Matemática:
   *   p'_i = p_i / \sum_{j=1}^{K} p_j
   *
   * Complexidade: O(|S|) temporal, O(|S|) espacial.
   */
  public normalize(
    raw: Record<EmotionalState, number>,
  ): Record<EmotionalState, number> {
    const sum = Object.values(raw).reduce(
      (acc, val) => acc + Math.max(0, val),
      0,
    );
    const safeSum = sum > 0 ? sum : 1.0;

    const normalized = {} as Record<EmotionalState, number>;
    for (const state of STATES_LIST) {
      const val = Math.max(0, raw[state] ?? 0);
      normalized[state] = Math.round((val / safeSum) * 100) / 100;
    }

    // Ajuste fino para garantir soma exata de 1.0 devido a arredondamento
    const currentSum = Object.values(normalized).reduce((a, b) => a + b, 0);
    const diff = Math.round((1.0 - currentSum) * 100) / 100;
    if (diff !== 0) {
      normalized.relaxed = Math.max(
        0,
        Math.round((normalized.relaxed + diff) * 100) / 100,
      );
    }

    return normalized;
  }

  /**
   * Aplica decaimento temporal contínuo em direção ao estado padrão (Relaxado).
   *
   * Modelação Matemática:
   *   b(t) = b_{default} + (b(0) - b_{default}) * e^{-\lambda * t}
   *   onde \lambda = \ln(2) / t_{1/2}
   */
  public decayWithTime(
    currentBelief: BeliefState,
    now: Date = new Date(),
  ): BeliefState {
    const lastTime = new Date(currentBelief.updatedAt).getTime();
    const elapsedMinutes = Math.max(
      0,
      (now.getTime() - lastTime) / (1000 * 60),
    );

    if (elapsedMinutes <= 0) return currentBelief;

    // Se passou mais do que 3x a meia-vida (90 min), retorna o prior padrão
    if (elapsedMinutes >= this.decayHalfLifeMinutes * 3) {
      return this.getDefaultBelief(now.toISOString());
    }

    const lambda = Math.LN2 / this.decayHalfLifeMinutes;
    const decayFactor = Math.exp(-lambda * elapsedMinutes);

    const decayedRaw = {} as Record<EmotionalState, number>;
    for (const state of STATES_LIST) {
      const target = this.defaultPrior[state];
      const initial = currentBelief[state] ?? target;
      decayedRaw[state] = target + (initial - target) * decayFactor;
    }

    const normalized = this.normalize(decayedRaw);
    return {
      ...normalized,
      updatedAt: now.toISOString(),
    };
  }

  /**
   * Calcula a taxa de aprendizagem bayesiana (\alpha) com calibração adaptativa:
   * 1. Sensibilidade de alerta (alta sensibilidade acelera a resposta a stress).
   * 2. Raridade da observação (eventos raros têm maior peso de informação / surpresa).
   */
  public calculateAdaptiveAlpha(options: UpdateBeliefOptions): number {
    const {
      observedState,
      alertSensitivity = "medium",
      baselineFrequency = 0,
      sampleSize = 0,
    } = options;

    let alpha = 0.3;
    const isAlertOrDistress =
      observedState === "distress" || observedState === "alert";

    if (alertSensitivity === "high") {
      alpha = isAlertOrDistress ? 0.6 : 0.4;
    } else if (alertSensitivity === "low") {
      alpha = isAlertOrDistress ? 0.15 : 0.3;
    }

    const isRareForAnimal = sampleSize >= 5 && baselineFrequency < 0.1;
    if (isRareForAnimal) {
      alpha = Math.min(alpha + 0.15, 0.75);
    }

    return alpha;
  }

  /**
   * Atualização Bayesiana de Crença POMDP.
   *
   * Equação de Atualização de Crença:
   *   b'(s) \propto (1 - \alpha) * b(s) + \alpha * P(O | s)
   *
   * @param previousBelief Crença prévia (a priori)
   * @param options Dados da observação (estado, confiança, calibração)
   */
  public updateBelief(
    previousBelief: BeliefState,
    options: UpdateBeliefOptions,
    now: Date = new Date(),
  ): BeliefState {
    const { observedState, confidence } = options;
    const alpha = this.calculateAdaptiveAlpha(options);

    // Primeiro aplica decaimento com base no tempo decorrido desde a última observação
    const decayed = this.decayWithTime(previousBelief, now);

    const updatedRaw = {} as Record<EmotionalState, number>;
    for (const state of STATES_LIST) {
      const isObserved = state === observedState;
      const observationLikelihood = isObserved
        ? Math.min(1.0, Math.max(0.0, confidence))
        : 0;
      const prior = decayed[state] ?? this.defaultPrior[state];
      updatedRaw[state] = (1 - alpha) * prior + alpha * observationLikelihood;
    }

    const normalized = this.normalize(updatedRaw);

    return {
      ...normalized,
      updatedAt: now.toISOString(),
    };
  }
}

export const beliefEngine = new BayesianBeliefEngine();
