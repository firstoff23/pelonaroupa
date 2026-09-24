import { describe, expect, it } from "vitest";
import { resolveCompanionState } from "./companionStates";

describe("companionStates - resolveCompanionState", () => {
  it("returns sleeping when distribution is missing or empty", () => {
    expect(resolveCompanionState(undefined).stateId).toBe("sleeping");
    expect(resolveCompanionState({}).stateId).toBe("sleeping");
  });

  it("returns sleeping when total events < 3", () => {
    const res = resolveCompanionState({ relaxed: 2 }, 2);
    expect(res.stateId).toBe("sleeping");
    expect(res.config.id).toBe("sleeping");
  });

  it("resolves to calm when relaxed is over 50%", () => {
    const res = resolveCompanionState({
      relaxed: 6,
      alert: 2,
      hunger: 2,
    });
    expect(res.stateId).toBe("calm");
    expect(res.percentage).toBe(60);
    expect(res.dominantEmotionalState).toBe("relaxed");
  });

  it("resolves to worried when distress is >= 30%", () => {
    const res = resolveCompanionState({
      distress: 4,
      relaxed: 6,
    });
    // distress = 4/10 = 40% (threshold is 30%)
    // relaxed = 6/10 = 60% (threshold is 50%)
    // relaxed has 60% vs 40%, so relaxed wins
    expect(res.stateId).toBe("calm");

    // But if distress has 35% and relaxed only 45% (which is below relaxed threshold 50%):
    const res2 = resolveCompanionState({
      distress: 4,
      relaxed: 4,
      alert: 2,
    });
    // distress = 40% (>= 30%), relaxed = 40% (< 50%), alert = 20% (< 40%)
    expect(res2.stateId).toBe("worried");
  });

  it("breaks ties with clinical priority when percentages are equal", () => {
    // Both distress (40%) and excitement (40%) qualify (distress threshold 30%, excitement 40%)
    // distress has higher clinical tie priority than excitement
    const res = resolveCompanionState({
      distress: 4,
      excitement: 4,
      relaxed: 2,
    });
    expect(res.stateId).toBe("worried");
  });

  it("resolves alert when alert >= 40%", () => {
    const res = resolveCompanionState({
      alert: 5,
      relaxed: 3,
      attention: 2,
    });
    expect(res.stateId).toBe("alert");
    expect(res.percentage).toBe(50);
  });

  it("resolves hungry when hunger >= 40%", () => {
    const res = resolveCompanionState({
      hunger: 5,
      relaxed: 3,
      attention: 2,
    });
    expect(res.stateId).toBe("hungry");
    expect(res.percentage).toBe(50);
  });

  it("resolves attentive when attention >= 40%", () => {
    const res = resolveCompanionState({
      attention: 5,
      relaxed: 3,
      excitement: 2,
    });
    expect(res.stateId).toBe("attentive");
    expect(res.percentage).toBe(50);
  });

  it("falls back to the highest percentage when no state meets its strict threshold", () => {
    // 35% relaxed (<50%), 25% alert (<40%), 25% excitement (<40%), 15% hunger (<40%)
    const res = resolveCompanionState({
      relaxed: 7,
      alert: 5,
      excitement: 5,
      hunger: 3,
    });
    // None crossed individual threshold, but relaxed is highest (35%)
    expect(res.stateId).toBe("calm");
    expect(res.percentage).toBe(35);
  });
});
