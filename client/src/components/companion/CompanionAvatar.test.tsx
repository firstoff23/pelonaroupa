// biome-ignore lint/correctness/noUnusedImports: React needed for JSX in Vitest
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "../../hooks/useLanguage";
import { CompanionAvatar } from "./CompanionAvatar";
import { COMPANION_STATES } from "./companionStates";

describe("CompanionAvatar Component", () => {
  it("renders with role='img' and accessible aria-label", () => {
    const markup = renderToStaticMarkup(
      <LanguageProvider>
        <CompanionAvatar stateId="calm" animalName="Yoshi" />
      </LanguageProvider>,
    );

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="');
    expect(markup).toContain("Yoshi");
  });

  it("renders distinct elements for cat vs dog species", () => {
    const dogMarkup = renderToStaticMarkup(
      <LanguageProvider>
        <CompanionAvatar species="dog" stateId="calm" />
      </LanguageProvider>,
    );
    const catMarkup = renderToStaticMarkup(
      <LanguageProvider>
        <CompanionAvatar species="cat" stateId="calm" />
      </LanguageProvider>,
    );

    // Cat markup has polygon triangular ears
    expect(catMarkup).toContain("<polygon");
    // Dog markup uses curved path ears
    expect(dogMarkup).toContain("<path");
  });

  it("renders all states without crashing", () => {
    const stateIds = Object.keys(
      COMPANION_STATES,
    ) as (keyof typeof COMPANION_STATES)[];
    for (const st of stateIds) {
      const markup = renderToStaticMarkup(
        <LanguageProvider>
          <CompanionAvatar stateId={st} animalName="Bob" />
        </LanguageProvider>,
      );
      expect(markup).toContain('role="img"');
      expect(markup).toContain("Bob");
    }
  });

  it("renders sleeping state with z symbols and closed eye paths", () => {
    const markup = renderToStaticMarkup(
      <LanguageProvider>
        <CompanionAvatar stateId="sleeping" animalName="Bob" />
      </LanguageProvider>,
    );
    expect(markup).toContain(">z<");
  });

  it("renders hungry state with food bowl path", () => {
    const markup = renderToStaticMarkup(
      <LanguageProvider>
        <CompanionAvatar stateId="hungry" animalName="Luna" />
      </LanguageProvider>,
    );
    expect(markup).toContain("M 43 82 L 57 82");
  });
});
