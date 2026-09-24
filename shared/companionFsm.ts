// shared/companionFsm.ts
// Análise de Requisitos & UML – Máquina de Estados Finitos (FSM) do Companheiro Emocional
//
// Implementação formal dos conceitos do Slide 23 de UML (Diagrama de Estados):
// - Estados finitos bem definidos
// - Eventos de estímulo externos (áudio bioacústico, cuidados, interação, inatividade)
// - Condições de guarda (Guards) para prevenção de falsos alarmes
// - Transições de estado determinísticas com rastreabilidade da razão

// Estados discretos da FSM do Companheiro Emocional
export type CompanionMoodState =
  | "resting"
  | "relaxed"
  | "playful"
  | "alert"
  | "distress";

export type CompanionEvent =
  | {
      type: "BIOACOUSTIC_EVENT";
      state: "relaxed" | "distress" | "attention" | "excitement" | "hunger" | "alert";
      confidence: number;
    }
  | {
      type: "CARE_COMPLETED";
      careType: "feeding" | "medication" | "walk" | "hygiene" | "other";
    }
  | {
      type: "TUTOR_INTERACTION";
      action: "pet" | "open_companion" | "view_dashboard";
    }
  | {
      type: "INACTIVITY_CHECK";
      minutesSinceLastEvent: number;
    };

export interface FsmTransitionResult {
  previousState: CompanionMoodState;
  currentState: CompanionMoodState;
  event: CompanionEvent;
  guardPassed: boolean;
  transitionReason: string;
}

/**
 * Limiar mínimo de confiança para permitir transição direta para estados críticos (distress).
 * Evita que ruídos espúrios alterem abruptamente o estado emocional do animal.
 */
export const MIN_DISTRESS_CONFIDENCE_GUARD = 0.55;

/**
 * Função de transição pura da Máquina de Estados (State Machine Transition Function).
 * delta(Estado_Atual, Evento) -> Novo_Estado
 */
export function transitionCompanionFsm(
  currentState: CompanionMoodState,
  event: CompanionEvent,
): FsmTransitionResult {
  switch (event.type) {
    case "BIOACOUSTIC_EVENT": {
      // 1. Áudio de Desconforto / Sofrimento
      if (event.state === "distress") {
        if (event.confidence >= MIN_DISTRESS_CONFIDENCE_GUARD) {
          return {
            previousState: currentState,
            currentState: "distress",
            event,
            guardPassed: true,
            transitionReason: `Transição para distress validada com confiança (${(event.confidence * 100).toFixed(0)}% >= 55%).`,
          };
        }
        // Guarda falhou: ruído duvidoso transita para alerta preventivo em vez de aflição
        return {
          previousState: currentState,
          currentState: "alert",
          event,
          guardPassed: false,
          transitionReason: `Vocalização de desconforto com baixa confiança (${(event.confidence * 100).toFixed(0)}%). Guarda acionou estado de alerta preventivo.`,
        };
      }

      // 2. Excitação / Brincadeira
      if (event.state === "excitement") {
        return {
          previousState: currentState,
          currentState: "playful",
          event,
          guardPassed: true,
          transitionReason: "Vocalização de alegria/excitação detetada.",
        };
      }

      // 3. Alerta / Atenção / Fome
      if (event.state === "alert" || event.state === "attention" || event.state === "hunger") {
        return {
          previousState: currentState,
          currentState: "alert",
          event,
          guardPassed: true,
          transitionReason: `Necessidade detetada (${event.state}) com foco no tutor.`,
        };
      }

      // 4. Relaxado
      if (event.state === "relaxed") {
        return {
          previousState: currentState,
          currentState: "relaxed",
          event,
          guardPassed: true,
          transitionReason: "Vocalização de relaxamento e contentamento.",
        };
      }

      return {
        previousState: currentState,
        currentState,
        event,
        guardPassed: true,
        transitionReason: "Nenhuma alteração de estado necessária.",
      };
    }

    case "CARE_COMPLETED": {
      // Cuidados concluídos (passeio ou alimentação) promovem bem-estar ou calma
      if (event.careType === "walk") {
        return {
          previousState: currentState,
          currentState: "playful",
          event,
          guardPassed: true,
          transitionReason: "Passeio concluído: energia positiva e estado brincalhão.",
        };
      }
      if (event.careType === "feeding") {
        return {
          previousState: currentState,
          currentState: "relaxed",
          event,
          guardPassed: true,
          transitionReason: "Refeição concluída: saciedade e relaxamento.",
        };
      }
      // Outros cuidados estabilizam se estava em distress ou alert
      if (currentState === "distress" || currentState === "alert") {
        return {
          previousState: currentState,
          currentState: "relaxed",
          event,
          guardPassed: true,
          transitionReason: "Cuidado veterinário/higiene efetuado: retorno ao estado calmo.",
        };
      }
      return {
        previousState: currentState,
        currentState,
        event,
        guardPassed: true,
        transitionReason: "Cuidado registado sem impacto no estado emocional atual.",
      };
    }

    case "TUTOR_INTERACTION": {
      // Interação direta do tutor anima ou acalma
      if (currentState === "distress") {
        return {
          previousState: currentState,
          currentState: "alert",
          event,
          guardPassed: true,
          transitionReason: "Interação do tutor conforta o animal em sofrimento.",
        };
      }
      if (currentState === "resting") {
        return {
          previousState: currentState,
          currentState: "relaxed",
          event,
          guardPassed: true,
          transitionReason: "O animal acordou com a presença e carinho do tutor.",
        };
      }
      return {
        previousState: currentState,
        currentState,
        event,
        guardPassed: true,
        transitionReason: "Interação com o tutor registada.",
      };
    }

    case "INACTIVITY_CHECK": {
      // Mais de 2 horas (120 min) sem qualquer estímulo transita para resting
      if (event.minutesSinceLastEvent >= 120 && currentState !== "distress") {
        return {
          previousState: currentState,
          currentState: "resting",
          event,
          guardPassed: true,
          transitionReason: `Inatividade de ${event.minutesSinceLastEvent} min: transição suave para repouso.`,
        };
      }
      return {
        previousState: currentState,
        currentState,
        event,
        guardPassed: true,
        transitionReason: "Tempo de inatividade dentro dos limites operacionais normais.",
      };
    }
  }
}
