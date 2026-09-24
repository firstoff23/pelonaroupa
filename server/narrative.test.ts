import { describe, expect, it } from "vitest";
import {
  buildNarrativeCacheKey,
  calculateWeeklyNarrative,
  classifyHourToPeriod,
  clearNarrativeCache,
  getCachedNarrative,
  getHourInTimezone,
  setCachedNarrative,
} from "./services/narrative";

describe("Narrative Service - Pure Inference", () => {
  const baseDate = new Date("2026-09-24T12:00:00Z");

  it("handles insufficient data (< 3 events) with informative message and record_more recommendation", () => {
    const result = calculateWeeklyNarrative({
      animalId: 1,
      animalName: "Yoshi",
      events: [
        { state: "relaxed", created_at: "2026-09-23T10:00:00Z" },
        { state: "relaxed", created_at: "2026-09-22T10:00:00Z" },
      ],
      now: baseDate,
      periodDays: 7,
    });

    expect(result.hasSufficientData).toBe(false);
    expect(result.totalRecordings).toBe(2);
    expect(result.recommendationType).toBe("record_more");
    expect(result.templateKey).toBe("insufficient_data");
    expect(result.fallbackNarrative.pt).toContain("Yoshi tem apenas 2");
    expect(result.fallbackNarrative.en).toContain("Yoshi only has 2");
  });

  it("identifies mostly_relaxed pattern when relaxed percentage >= 60%", () => {
    const result = calculateWeeklyNarrative({
      animalId: 1,
      animalName: "Yoshi",
      events: [
        { state: "relaxed", created_at: "2026-09-24T10:00:00Z" },
        { state: "relaxed", created_at: "2026-09-23T11:00:00Z" },
        { state: "relaxed", created_at: "2026-09-22T12:00:00Z" },
        { state: "attention", created_at: "2026-09-21T13:00:00Z" },
      ],
      now: baseDate,
      periodDays: 7,
    });

    expect(result.hasSufficientData).toBe(true);
    expect(result.dominantState).toBe("relaxed");
    expect(result.relaxedPercentage).toBe(75);
    expect(result.templateKey).toBe("mostly_relaxed");
    expect(result.recommendationType).toBe("positive_routine");
    expect(result.fallbackNarrative.pt).toContain("maioritariamente relaxado");
  });

  it("detects night_distress pattern and recommends vet consult", () => {
    const result = calculateWeeklyNarrative({
      animalId: 2,
      animalName: "Bobi",
      events: [
        // 3 night distress events (22h, 23h, 01h UTC)
        { state: "distress", created_at: "2026-09-23T22:30:00Z" },
        { state: "distress", created_at: "2026-09-22T23:00:00Z" },
        { state: "distress", created_at: "2026-09-21T01:15:00Z" },
        // other states
        { state: "relaxed", created_at: "2026-09-24T09:00:00Z" },
        { state: "relaxed", created_at: "2026-09-23T15:00:00Z" },
        { state: "attention", created_at: "2026-09-22T10:00:00Z" },
      ],
      now: baseDate,
      periodDays: 7,
      timezone: "UTC",
    });

    expect(result.hasSufficientData).toBe(true);
    expect(result.distressCount).toBe(3);
    expect(result.predominantDistressPeriod).toBe("night");
    expect(result.templateKey).toBe("night_distress");
    expect(result.recommendationType).toBe("vet_consult");
    expect(result.fallbackNarrative.pt).toContain("sobretudo à noite");
    expect(result.fallbackNarrative.pt).toContain("veterinário");
  });

  it("detects frequent_distress during daytime and suggests veterinary consult", () => {
    const result = calculateWeeklyNarrative({
      animalId: 3,
      animalName: "Luna",
      events: [
        { state: "distress", created_at: "2026-09-24T09:30:00Z" },
        { state: "distress", created_at: "2026-09-23T14:00:00Z" },
        { state: "distress", created_at: "2026-09-22T15:00:00Z" },
        { state: "attention", created_at: "2026-09-21T10:00:00Z" },
      ],
      now: baseDate,
      periodDays: 7,
      timezone: "UTC",
    });

    expect(result.hasSufficientData).toBe(true);
    expect(result.templateKey).toBe("frequent_distress");
    expect(result.recommendationType).toBe("vet_consult");
    expect(result.fallbackNarrative.pt).toContain("3 episódios de angústia");
  });

  it("detects balanced_routine when emotions are evenly distributed without alarms", () => {
    const result = calculateWeeklyNarrative({
      animalId: 4,
      animalName: "Pipoca",
      events: [
        { state: "attention", created_at: "2026-09-24T10:00:00Z" },
        { state: "attention", created_at: "2026-09-23T11:00:00Z" },
        { state: "relaxed", created_at: "2026-09-22T12:00:00Z" },
        { state: "excitement", created_at: "2026-09-21T13:00:00Z" },
      ],
      now: baseDate,
      periodDays: 7,
    });

    expect(result.hasSufficientData).toBe(true);
    expect(result.templateKey).toBe("balanced_routine");
    expect(result.recommendationType).toBe("continue_monitoring");
    expect(result.dominantState).toBe("attention");
  });

  it("correctly classifies hours into morning, afternoon, and night", () => {
    expect(classifyHourToPeriod(8)).toBe("morning");
    expect(classifyHourToPeriod(14)).toBe("afternoon");
    expect(classifyHourToPeriod(21)).toBe("night");
    expect(classifyHourToPeriod(2)).toBe("night");
  });

  it("converts timezone properly with getHourInTimezone", () => {
    // 2026-09-24T23:30:00Z is 23:30 in UTC, and in Tokyo (+9) it is 08:30 (next day)
    const date = new Date("2026-09-24T23:30:00Z");
    const utcHour = getHourInTimezone(date, "UTC");
    const tokyoHour = getHourInTimezone(date, "Asia/Tokyo");

    expect(utcHour).toBe(23);
    expect(tokyoHour).toBe(8);
  });

  it("caches and retrieves narratives correctly with daily TTL", () => {
    clearNarrativeCache();
    const key = buildNarrativeCacheKey(10, new Date("2026-09-24T10:00:00Z"));
    expect(key).toBe("10:2026-09-24");

    const sample = calculateWeeklyNarrative({
      animalId: 10,
      animalName: "Kiko",
      events: [
        { state: "relaxed", created_at: "2026-09-24T10:00:00Z" },
        { state: "relaxed", created_at: "2026-09-23T10:00:00Z" },
        { state: "relaxed", created_at: "2026-09-22T10:00:00Z" },
      ],
      now: baseDate,
    });

    setCachedNarrative(key, sample);
    const cached = getCachedNarrative(key);
    expect(cached).not.toBeNull();
    expect(cached?.animalName).toBe("Kiko");

    clearNarrativeCache(10);
    expect(getCachedNarrative(key)).toBeNull();
  });
});
