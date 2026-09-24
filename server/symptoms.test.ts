import { describe, expect, it } from "vitest";
import {
  ALL_SYMPTOMS,
  getCategoryForSymptom,
  getSymptomById,
  getSymptomByLegacyOrId,
  hasAnyRedFlag,
  SYMPTOM_CATEGORIES,
  searchSymptoms,
} from "../shared/symptoms";

describe("Holistic Symptoms Domain Model", () => {
  it("defines all 7 clinical categories", () => {
    expect(SYMPTOM_CATEGORIES.length).toBe(7);
    expect(ALL_SYMPTOMS.length).toBeGreaterThanOrEqual(22);
    const categoryIds = SYMPTOM_CATEGORIES.map((c) => c.id);
    expect(categoryIds).toEqual([
      "nutrition",
      "activity",
      "respiratory",
      "skin_coat",
      "urinary",
      "neurological",
      "systemic",
    ]);
  });

  it("retains all 18 original legacy symptoms with exact legacyId values", () => {
    const original18 = [
      "vomiting",
      "diarrhea",
      "lethargy",
      "appetite_loss",
      "excessive_drinking",
      "scratching",
      "coughing",
      "sneezing",
      "limping",
      "eye_discharge",
      "nasal_discharge",
      "bloating",
      "weight_loss",
      "trembling",
      "seizures",
      "blood_urine",
      "bad_breath",
      "hair_loss",
    ];

    for (const legacyId of original18) {
      const found = getSymptomByLegacyOrId(legacyId);
      expect(found).toBeDefined();
      expect(found?.legacyId).toBe(legacyId);
      expect(found?.labelKey).toBeTruthy();
    }
  });

  it("identifies red flag symptoms correctly", () => {
    // Red flags
    expect(getSymptomById("seizures")?.isRedFlag).toBe(true);
    expect(getSymptomById("blood_urine")?.isRedFlag).toBe(true);
    expect(getSymptomById("bloating")?.isRedFlag).toBe(true);
    expect(getSymptomById("urination_difficulty")?.isRedFlag).toBe(true);

    // Non-red flags
    expect(getSymptomById("coughing")?.isRedFlag).toBeFalsy();
    expect(getSymptomById("scratching")?.isRedFlag).toBeFalsy();
  });

  it("hasAnyRedFlag returns true for high severity or red flag symptoms", () => {
    expect(hasAnyRedFlag(["coughing"], "low")).toBe(false);
    expect(hasAnyRedFlag(["coughing"], "medium")).toBe(false);
    expect(hasAnyRedFlag(["coughing"], "high")).toBe(true);
    expect(hasAnyRedFlag(["seizures"], "low")).toBe(true);
    expect(hasAnyRedFlag(["blood_urine"], "medium")).toBe(true);
    expect(hasAnyRedFlag(["vomiting", "bloating"], "low")).toBe(true);
  });

  it("links symptoms to their parent category", () => {
    const nutritionCat = getCategoryForSymptom("vomiting");
    expect(nutritionCat?.id).toBe("nutrition");

    const skinCat = getCategoryForSymptom("scratching");
    expect(skinCat?.id).toBe("skin_coat");

    const neuroCat = getCategoryForSymptom("seizures");
    expect(neuroCat?.id).toBe("neurological");
  });

  it("searches symptoms with category context in Portuguese and English", () => {
    const ptResults = searchSymptoms("vóm", "pt");
    expect(ptResults.length).toBeGreaterThan(0);
    expect(ptResults[0].symptom.id).toBe("vomiting");
    expect(ptResults[0].category.id).toBe("nutrition");

    const enResults = searchSymptoms("cough", "en");
    expect(enResults.length).toBeGreaterThan(0);
    expect(enResults[0].symptom.id).toBe("coughing");
    expect(enResults[0].category.id).toBe("respiratory");

    const skinResults = searchSymptoms("pele", "pt");
    expect(skinResults.length).toBeGreaterThan(0);
    expect(skinResults.some((r) => r.category.id === "skin_coat")).toBe(true);
  });
});
