// server/companionFsm.test.ts
import { describe, expect, it } from "vitest";
import {
  MIN_DISTRESS_CONFIDENCE_GUARD,
  transitionCompanionFsm,
} from "../shared/companionFsm";

describe("companionFsm - Máquina de Estados Finitos (UML State Machine)", () => {
  it("transita de relaxed para distress quando a confiança do áudio supera a guarda", () => {
    const res = transitionCompanionFsm("relaxed", {
      type: "BIOACOUSTIC_EVENT",
      state: "distress",
      confidence: 0.82,
    });
    expect(res.currentState).toBe("distress");
    expect(res.guardPassed).toBe(true);
    expect(res.transitionReason).toContain("distress validada");
  });

  it("aciona guarda e transita para alert em vez de distress se confiança for baixa", () => {
    const res = transitionCompanionFsm("relaxed", {
      type: "BIOACOUSTIC_EVENT",
      state: "distress",
      confidence: 0.40, // Abaixo do limiar MIN_DISTRESS_CONFIDENCE_GUARD (0.55)
    });
    expect(res.currentState).toBe("alert");
    expect(res.guardPassed).toBe(false);
    expect(res.transitionReason).toContain("baixa confiança");
  });

  it("transita para playful após passeio ou áudio de excitação", () => {
    const audioRes = transitionCompanionFsm("resting", {
      type: "BIOACOUSTIC_EVENT",
      state: "excitement",
      confidence: 0.9,
    });
    expect(audioRes.currentState).toBe("playful");

    const walkRes = transitionCompanionFsm("relaxed", {
      type: "CARE_COMPLETED",
      careType: "walk",
    });
    expect(walkRes.currentState).toBe("playful");
  });

  it("refeição acalma animal que estava alerta e retorna a relaxed", () => {
    const res = transitionCompanionFsm("alert", {
      type: "CARE_COMPLETED",
      careType: "feeding",
    });
    expect(res.currentState).toBe("relaxed");
  });

  it("inatividade superior a 120 minutos coloca o animal em resting", () => {
    const res = transitionCompanionFsm("relaxed", {
      type: "INACTIVITY_CHECK",
      minutesSinceLastEvent: 150,
    });
    expect(res.currentState).toBe("resting");
  });

  it("não força resting por inatividade se o animal estiver em distress", () => {
    const res = transitionCompanionFsm("distress", {
      type: "INACTIVITY_CHECK",
      minutesSinceLastEvent: 180,
    });
    expect(res.currentState).toBe("distress");
  });

  it("interação do tutor acorda animal adormecido", () => {
    const res = transitionCompanionFsm("resting", {
      type: "TUTOR_INTERACTION",
      action: "pet",
    });
    expect(res.currentState).toBe("relaxed");
  });
});
