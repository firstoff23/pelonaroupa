// client/src/components/personality/PersonalityRadar.test.tsx
// Tests for the PersonalityRadar SVG component (Inspiração 5)
// Uses renderToStaticMarkup to match project test convention (no @testing-library).

// biome-ignore lint/correctness/noUnusedImports: React needed for JSX in Vitest
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AnimalPersonality } from "../../../../shared/personality";
import { DEFAULT_PERSONALITY, PROVISIONAL_THRESHOLD } from "../../../../shared/personality";
import { PersonalityRadar } from "./PersonalityRadar";

const highConfidenceProfile: AnimalPersonality = {
  ...DEFAULT_PERSONALITY,
  animalId: 1,
  vocalExpressiveness: 4,
  stressResilience: 2,
  energyLevel: 5,
  sociability: 4,
  independence: 2,
  confidence: 0.85,
};

const provisionalProfile: AnimalPersonality = {
  ...DEFAULT_PERSONALITY,
  animalId: 2,
  confidence: PROVISIONAL_THRESHOLD - 0.1, // below threshold
};

describe("PersonalityRadar", () => {
  it("renders with role=img and aria-label", () => {
    const markup = renderToStaticMarkup(
      <PersonalityRadar personality={highConfidenceProfile} />,
    );
    expect(markup).toContain('role="img"');
    expect(markup).toContain("Radar de personalidade");
  });

  it("does NOT show provisional overlay for high confidence", () => {
    const markup = renderToStaticMarkup(
      <PersonalityRadar personality={highConfidenceProfile} />,
    );
    expect(markup).not.toContain("A analisar");
  });

  it("shows provisional overlay when confidence is below threshold", () => {
    const markup = renderToStaticMarkup(
      <PersonalityRadar personality={provisionalProfile} />,
    );
    expect(markup).toContain("A analisar");
  });

  it("shows provisional overlay when provisional prop is explicitly true", () => {
    const markup = renderToStaticMarkup(
      <PersonalityRadar personality={highConfidenceProfile} provisional={true} />,
    );
    expect(markup).toContain("A analisar");
  });

  it("renders all 5 dimension emoji labels", () => {
    const markup = renderToStaticMarkup(
      <PersonalityRadar personality={highConfidenceProfile} />,
    );
    expect(markup).toContain("🎵"); // vocalExpressiveness
    expect(markup).toContain("🧘"); // stressResilience
    expect(markup).toContain("⚡"); // energyLevel
    expect(markup).toContain("🤝"); // sociability
    expect(markup).toContain("🦅"); // independence
  });

  it("renders all 5 dimension text labels in Portuguese", () => {
    const markup = renderToStaticMarkup(
      <PersonalityRadar personality={highConfidenceProfile} />,
    );
    expect(markup).toContain("Expressividade Vocal");
    expect(markup).toContain("Resili");  // Resiliência – avoid encoding issues
    expect(markup).toContain("Energia");
    expect(markup).toContain("Sociabilidade");
    expect(markup).toContain("Independ");
  });

  it("includes an SVG polygon for the score fill", () => {
    const markup = renderToStaticMarkup(
      <PersonalityRadar personality={highConfidenceProfile} />,
    );
    // The filled score polygon uses fill="var(--primary)"
    expect(markup).toContain("var(--primary)");
    expect(markup).toContain("<polygon");
  });
});
