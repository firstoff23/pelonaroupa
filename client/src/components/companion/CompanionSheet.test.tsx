// biome-ignore lint/correctness/noUnusedImports: React needed for JSX in Vitest
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Router } from "wouter";
import { LanguageProvider } from "../../hooks/useLanguage";
import { CompanionDetailsContent } from "./CompanionSheet";
import { resolveCompanionState } from "./companionStates";

describe("CompanionDetailsContent Component", () => {
  const mockAnimal = { id: 1, name: "Yoshi", species: "dog" };

  it("renders animal name, badge, and segmented distribution when open", () => {
    const resolution = resolveCompanionState({
      relaxed: 6,
      alert: 2,
      distress: 2,
    });

    const markup = renderToStaticMarkup(
      <LanguageProvider>
        <Router ssrPath="/">
          <CompanionDetailsContent
            resolution={resolution}
            animal={mockAnimal}
            distribution={{ relaxed: 6, alert: 2, distress: 2 }}
          />
        </Router>
      </LanguageProvider>,
    );

    expect(markup).toContain("Yoshi");
    expect(markup).toContain("Calmo");
    expect(markup).toContain("60%");
    expect(markup).toContain("Ver histórico completo");
    expect(markup).toContain("Fazer nova gravação");
  });

  it("renders empty state notice when data is insufficient (< 3 events)", () => {
    const resolution = resolveCompanionState({ relaxed: 1 }, 1);

    const markup = renderToStaticMarkup(
      <LanguageProvider>
        <Router ssrPath="/">
          <CompanionDetailsContent
            resolution={resolution}
            animal={mockAnimal}
            distribution={{ relaxed: 1 }}
          />
        </Router>
      </LanguageProvider>,
    );

    expect(markup).toContain("Yoshi");
    expect(markup).toContain("A descansar");
    expect(markup).toContain("Conhece o estado");
  });
});
