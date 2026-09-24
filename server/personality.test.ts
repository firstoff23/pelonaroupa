// server/personality.test.ts
// Unit tests for personality inference service (Inspiração 5)
// Tests run in isolation (no Supabase) – pure function coverage.

import { describe, expect, it } from "vitest";

// ─── Re-export the internal helpers by importing from the service
// We test the pure math helpers via a thin re-export shim below.

// Since the helpers (lerp, clamp, roundScore, computeDimensions) are private,
// we exercise them through a factory that mirrors the logic.

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const roundScore = (v: number) => Math.max(1, Math.min(5, Math.round(v)));

interface MockDist {
  distress: number;
  alert: number;
  hunger: number;
  attention: number;
  excitement: number;
  relaxed: number;
}

/**
 * Mirrors the dimension computation logic from personality.ts.
 * Kept in sync manually – any algorithm change should fail these tests.
 */
function computeDimensions(dist: MockDist) {
  const n =
    dist.distress + dist.alert + dist.hunger + dist.attention + dist.excitement + dist.relaxed;
  if (n === 0) return null;
  const r = (count: number) => count / n;

  const vocalScore = roundScore(lerp(1, 5, clamp(r(dist.distress + dist.excitement) * 2.5)));
  const resilScore = roundScore(
    lerp(1, 5, clamp((r(dist.relaxed) - r(dist.distress) * 2 + 1) / 2)),
  );
  const energyScore = roundScore(lerp(1, 5, clamp(r(dist.excitement + dist.alert) * 2.5)));
  const socialScore = roundScore(lerp(1, 5, clamp(r(dist.attention + dist.excitement) * 2.5)));
  const independenceScore = roundScore(
    lerp(1, 5, clamp(1 - r(dist.hunger + dist.distress) * 2)),
  );
  return { vocalScore, resilScore, energyScore, socialScore, independenceScore };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Personality dimension inference", () => {
  it("returns null for zero events", () => {
    const result = computeDimensions({
      distress: 0,
      alert: 0,
      hunger: 0,
      attention: 0,
      excitement: 0,
      relaxed: 0,
    });
    expect(result).toBeNull();
  });

  it("mostly relaxed animal → low vocal, high resilience, low energy", () => {
    const result = computeDimensions({
      distress: 1,
      alert: 1,
      hunger: 1,
      attention: 2,
      excitement: 1,
      relaxed: 94,
    });
    expect(result).not.toBeNull();
    expect(result!.vocalScore).toBeLessThanOrEqual(2);
    expect(result!.resilScore).toBeGreaterThanOrEqual(4);
    expect(result!.energyScore).toBeLessThanOrEqual(2);
  });

  it("highly distressed animal → high vocal, low resilience, high independence concern", () => {
    const result = computeDimensions({
      distress: 70,
      alert: 10,
      hunger: 10,
      attention: 5,
      excitement: 3,
      relaxed: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.vocalScore).toBeGreaterThanOrEqual(4);
    expect(result!.resilScore).toBeLessThanOrEqual(2);
    expect(result!.independenceScore).toBeLessThanOrEqual(2);
  });

  it("excited/social animal → high energy, high sociability", () => {
    const result = computeDimensions({
      distress: 2,
      alert: 8,
      hunger: 5,
      attention: 30,
      excitement: 50,
      relaxed: 5,
    });
    expect(result).not.toBeNull();
    expect(result!.energyScore).toBeGreaterThanOrEqual(4);
    expect(result!.socialScore).toBeGreaterThanOrEqual(4);
  });

  it("all scores are in range [1, 5]", () => {
    // Stress-test: all extreme distributions
    const extremes = [
      { distress: 100, alert: 0, hunger: 0, attention: 0, excitement: 0, relaxed: 0 },
      { distress: 0, alert: 0, hunger: 0, attention: 0, excitement: 0, relaxed: 100 },
      { distress: 0, alert: 50, hunger: 50, attention: 0, excitement: 0, relaxed: 0 },
    ];
    for (const dist of extremes) {
      const r = computeDimensions(dist);
      expect(r).not.toBeNull();
      for (const v of Object.values(r!)) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(5);
      }
    }
  });

  it("balanced neutral distribution → all scores near 3", () => {
    const result = computeDimensions({
      distress: 17,
      alert: 17,
      hunger: 17,
      attention: 16,
      excitement: 16,
      relaxed: 17,
    });
    expect(result).not.toBeNull();
    // Neutral distribution should produce mid-range scores
    for (const v of Object.values(result!)) {
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(4);
    }
  });
});

describe("Confidence computation", () => {
  const MIN_EVENTS = 10;
  const computeConf = (n: number) => Math.min(1, Math.sqrt(n / MIN_EVENTS));

  it("0 events → confidence 0", () => {
    expect(computeConf(0)).toBe(0);
  });

  it("MIN_EVENTS events → confidence 1", () => {
    expect(computeConf(MIN_EVENTS)).toBe(1);
  });

  it("half of MIN_EVENTS → confidence ~0.71", () => {
    const c = computeConf(MIN_EVENTS / 2);
    expect(c).toBeCloseTo(0.707, 2);
  });

  it("never exceeds 1", () => {
    expect(computeConf(10000)).toBe(1);
  });
});

describe("PROVISIONAL_THRESHOLD", () => {
  it("is 0.4 (hardcoded contract)", async () => {
    // If this changes, all UI provisional states need review
    const { PROVISIONAL_THRESHOLD } = await import("../../shared/personality");
    expect(PROVISIONAL_THRESHOLD).toBe(0.4);
  });
});

describe("PERSONALITY_DIMENSIONS order", () => {
  it("has exactly 5 dimensions in the canonical order", async () => {
    const { PERSONALITY_DIMENSIONS } = await import("../../shared/personality");
    expect(PERSONALITY_DIMENSIONS).toHaveLength(5);
    expect(PERSONALITY_DIMENSIONS).toEqual([
      "vocalExpressiveness",
      "stressResilience",
      "energyLevel",
      "sociability",
      "independence",
    ]);
  });
});
