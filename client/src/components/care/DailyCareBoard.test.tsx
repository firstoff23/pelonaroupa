// biome-ignore lint/correctness/noUnusedImports: React needed for JSX in Vitest
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DailyCareBoardData } from "../../../../shared/care";
import { ROUTINE_CARE_DEFINITIONS } from "../../../../shared/care";
import { LanguageProvider } from "../../hooks/useLanguage";
import { DailyCareBoardContent } from "./DailyCareBoard";

describe("DailyCareBoardContent Component", () => {
  const mockBoardData: DailyCareBoardData = {
    animalId: 1,
    careDate: "2026-09-24",
    timezone: "Europe/Lisbon",
    totalRoutineCount: 5,
    completedCount: 2,
    routineItems: ROUTINE_CARE_DEFINITIONS.map((def, idx) => ({
      definition: def,
      isCompleted: idx < 2,
      completedLog:
        idx < 2
          ? {
              id: 100 + idx,
              animalId: 1,
              userId: 42,
              userName: "Maria",
              careType: def.careType,
              careSubtype: def.careSubtype,
              title: def.fallbackTitlePt,
              notes: null,
              careDate: "2026-09-24",
              completedAt: "2026-09-24T08:30:00.000Z",
            }
          : undefined,
    })),
    customLogs: [
      {
        id: 201,
        animalId: 1,
        userId: 42,
        userName: "João",
        careType: "medication",
        careSubtype: null,
        title: "Gotas nos olhos",
        notes: "Aplicado no olho esquerdo",
        careDate: "2026-09-24",
        completedAt: "2026-09-24T14:15:00.000Z",
      },
    ],
    bioacousticStatus: {
      hasRecordedToday: true,
      lastEventTime: "11:45",
      state: "relaxed",
      emoji: "🟢",
      confidence: 0.92,
    },
  };

  it("renders care board title, animal name, and progress badge", () => {
    const markup = renderToStaticMarkup(
      <LanguageProvider>
        <DailyCareBoardContent
          board={mockBoardData}
          animalName="Bobby"
          onOpenLogModal={vi.fn()}
          onQuickMarkRoutine={vi.fn()}
          onDeleteCare={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(markup).toContain("Quadro de Cuidados Diários");
    expect(markup).toContain("Bobby");
    expect(markup).toContain("2 / 5");
  });

  it("renders informative bioacoustic status without making it a checkable task", () => {
    const markup = renderToStaticMarkup(
      <LanguageProvider>
        <DailyCareBoardContent
          board={mockBoardData}
          animalName="Bobby"
          onOpenLogModal={vi.fn()}
          onQuickMarkRoutine={vi.fn()}
          onDeleteCare={vi.fn()}
        />
      </LanguageProvider>,
    );

    // Displays the informative status with emoji and time
    expect(markup).toContain("Estado Sonoro de Hoje (Informativo)");
    expect(markup).toContain("11:45");
    expect(markup).toContain("🟢");
    expect(markup).toContain("Relaxado");
  });

  it("renders empty bioacoustic status when no audio recorded today", () => {
    const emptyBioacousticBoard: DailyCareBoardData = {
      ...mockBoardData,
      bioacousticStatus: {
        hasRecordedToday: false,
        lastEventTime: null,
        state: null,
        emoji: null,
        confidence: null,
      },
    };

    const markup = renderToStaticMarkup(
      <LanguageProvider>
        <DailyCareBoardContent
          board={emptyBioacousticBoard}
          animalName="Bobby"
          onOpenLogModal={vi.fn()}
          onQuickMarkRoutine={vi.fn()}
          onDeleteCare={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(markup).toContain("Ainda não foram analisadas vocalizações hoje");
  });

  it("renders completed badges with user name and pending buttons for incomplete tasks", () => {
    const markup = renderToStaticMarkup(
      <LanguageProvider>
        <DailyCareBoardContent
          board={mockBoardData}
          animalName="Bobby"
          onOpenLogModal={vi.fn()}
          onQuickMarkRoutine={vi.fn()}
          onDeleteCare={vi.fn()}
        />
      </LanguageProvider>,
    );

    // Completed items show who did it
    expect(markup).toContain("Maria");
    expect(markup).toContain("Feito");

    // Incomplete items show pending badge or mark button
    expect(markup).toContain("Pendente hoje");
    expect(markup).toContain("Marcar");
  });

  it("renders custom ad-hoc care logs and notes", () => {
    const markup = renderToStaticMarkup(
      <LanguageProvider>
        <DailyCareBoardContent
          board={mockBoardData}
          animalName="Bobby"
          onOpenLogModal={vi.fn()}
          onQuickMarkRoutine={vi.fn()}
          onDeleteCare={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(markup).toContain("Gotas nos olhos");
    expect(markup).toContain("João");
    expect(markup).toContain("Aplicado no olho esquerdo");
  });
});
