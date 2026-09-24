import { describe, expect, it } from "vitest";
import {
  BayesianBeliefEngine,
  DEFAULT_BELIEF,
  STATES_LIST,
} from "./BayesianBeliefEngine";

describe("BayesianBeliefEngine (POMDP & Matemática Aplicada)", () => {
  const engine = new BayesianBeliefEngine();

  it("garante invariante estocástica: soma de probabilidades = 1.0", () => {
    const raw = {
      relaxed: 10,
      excitement: 25,
      distress: 5,
      hunger: 15,
      alert: 20,
      attention: 25,
    };
    const normalized = engine.normalize(raw);
    const sum = Object.values(normalized).reduce((a, b) => a + b, 0);

    expect(sum).toBeCloseTo(1.0, 2);
    for (const state of STATES_LIST) {
      expect(normalized[state]).toBeGreaterThanOrEqual(0);
      expect(normalized[state]).toBeLessThanOrEqual(1);
    }
  });

  it("retorna o prior padrão com timestamps atualizados", () => {
    const prior = engine.getDefaultBelief();
    expect(prior.relaxed).toBe(DEFAULT_BELIEF.relaxed);
    expect(prior.distress).toBe(DEFAULT_BELIEF.distress);
    expect(prior.updatedAt).toBeDefined();
  });

  it("aplica decaimento exponencial contínuo em direção ao estado padrão", () => {
    const initialTime = new Date("2026-09-24T00:00:00Z");
    const distressedBelief = {
      relaxed: 0.1,
      excitement: 0.05,
      distress: 0.7,
      hunger: 0.05,
      alert: 0.05,
      attention: 0.05,
      updatedAt: initialTime.toISOString(),
    };

    // 30 minutos depois (1 meia-vida): o distress deve cair significativamente
    const after30m = new Date("2026-09-24T00:30:00Z");
    const decayed30 = engine.decayWithTime(distressedBelief, after30m);
    expect(decayed30.distress).toBeLessThan(distressedBelief.distress);
    expect(decayed30.relaxed).toBeGreaterThan(distressedBelief.relaxed);

    // 120 minutos depois (> 3 meias-vidas): deve regressar ao estado padrão
    const after120m = new Date("2026-09-24T02:00:00Z");
    const decayed120 = engine.decayWithTime(distressedBelief, after120m);
    expect(decayed120.relaxed).toBeCloseTo(DEFAULT_BELIEF.relaxed, 1);
    expect(decayed120.distress).toBeCloseTo(DEFAULT_BELIEF.distress, 1);
  });

  it("adapta a taxa de aprendizagem alpha consoante a sensibilidade de alerta", () => {
    const highAlpha = engine.calculateAdaptiveAlpha({
      observedState: "distress",
      confidence: 0.9,
      alertSensitivity: "high",
    });

    const lowAlpha = engine.calculateAdaptiveAlpha({
      observedState: "distress",
      confidence: 0.9,
      alertSensitivity: "low",
    });

    expect(highAlpha).toBeGreaterThan(lowAlpha);
    expect(highAlpha).toBe(0.6);
    expect(lowAlpha).toBe(0.15);
  });

  it("aumenta alpha quando a observação é rara (rarity boost / surpresa bayesiana)", () => {
    const normalAlpha = engine.calculateAdaptiveAlpha({
      observedState: "distress",
      confidence: 0.9,
      alertSensitivity: "medium",
      baselineFrequency: 0.4,
      sampleSize: 10,
    });

    const rareAlpha = engine.calculateAdaptiveAlpha({
      observedState: "distress",
      confidence: 0.9,
      alertSensitivity: "medium",
      baselineFrequency: 0.05, // raro (< 10%)
      sampleSize: 10,
    });

    expect(rareAlpha).toBeGreaterThan(normalAlpha);
  });

  it("atualiza a crença de forma correta ao observar um evento de agitação/excitement", () => {
    const prior = engine.getDefaultBelief();
    const updated = engine.updateBelief(prior, {
      observedState: "excitement",
      confidence: 0.95,
      alertSensitivity: "medium",
    });

    expect(updated.excitement).toBeGreaterThan(prior.excitement);
    const sum = Object.values(updated)
      .filter((v): v is number => typeof v === "number")
      .reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 2);
  });
});
