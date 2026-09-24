import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  type EmotionalState,
  type ModelUsed,
  STATE_LABELS,
} from "../../shared/types";
import { notifyN8N } from "../_core/notification";
import { sendPushNotification } from "../_core/pushNotification";
import { checkRateLimit } from "../_core/rateLimiter";
import { protectedProcedure, router } from "../_core/trpc";
import {
  checkAndIncrementAnalysisLimit,
  getAnalysisUsage,
  getAnimalBaseline,
  getAnimalById,
  insertEvent,
  recalculateAnimalBehaviorBaseline,
  savePostureForEvent,
  updateBeliefStateForAnimal,
  updateEventAudio,
  uploadAudioToSupabase,
  verifyAnimalOwner,
} from "../db";
import { effectiveUserId } from "../lib/authHelpers";

const STATES: EmotionalState[] = [
  "distress",
  "attention",
  "excitement",
  "hunger",
  "alert",
  "relaxed",
];

const STATE_EMOJIS: Record<EmotionalState, string> = {
  distress: "🔴",
  attention: "🟡",
  excitement: "🟢",
  hunger: "🟠",
  alert: "🔵",
  relaxed: "⚪",
};

const PRIMARY_BACKEND_URL = "https://animalmind-backend.fly.dev";
const HF_BACKEND_URL = "https://firstoff-animalmind-backend.hf.space";
const CLASSIFY_TIMEOUT_MS = 5000;

/** General POST helper for ML backends. */
async function tryBackendPost(
  url: string,
  endpoint: string,
  formData: FormData,
  timeoutMs: number,
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${url}${endpoint}`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    console.warn(
      `[ML] Backend ${url}${endpoint} failed${isTimeout ? " (timeout)" : ""}: ${err}`,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Attempt to classify audio against a single backend URL, with timeout. */
async function tryClassifyBackend(
  url: string,
  formData: FormData,
  timeoutMs: number,
): Promise<{
  state: string;
  confidence: number;
  emoji: string;
  model_used: string;
} | null> {
  return tryBackendPost(url, "/classify", formData, timeoutMs);
}

function resolveMlBackendUrls(): string[] {
  const candidates = [
    process.env.FASTAPI_BACKEND_URL,
    process.env.VITE_API_URL,
    PRIMARY_BACKEND_URL,
    process.env.HF_BACKEND_URL,
    HF_BACKEND_URL,
  ];

  const seen = new Set<string>();
  const normalized = candidates
    .filter((url): url is string => Boolean(url?.trim()))
    .map((url) => url.trim().replace(/\/+$/, ""))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });

  // Group into fast and slow candidates (deprioritize hf.space URLs to the end to prevent Vercel timeouts)
  const fast = normalized.filter((url) => !url.includes("hf.space"));
  const slow = normalized.filter((url) => url.includes("hf.space"));

  return [...fast, ...slow];
}

/** Attempt to run vision detections against primary/fallback ML backend. */
async function tryVisionBackend(
  endpoint: string,
  imageBuffer: Buffer,
  timeoutMs: number,
): Promise<any> {
  for (const backendUrl of resolveMlBackendUrls()) {
    const file = new File([Uint8Array.from(imageBuffer)], "frame.jpg", {
      type: "image/jpeg",
    });
    const formData = new FormData();
    formData.append("file", file);

    const data = await tryBackendPost(
      backendUrl,
      endpoint,
      formData,
      timeoutMs,
    );
    if (data) return data;
  }
  return null;
}

/** Map raw backend response into our typed result shape. */
function mapBackendResult(data: {
  state: string;
  confidence: number;
  emoji: string;
  model_used: string;
}): {
  state: EmotionalState;
  confidence: number;
  emoji: string;
  model_used: ModelUsed;
  cached: boolean;
} | null {
  if (!STATES.includes(data.state as EmotionalState)) return null;
  let modelUsedMapped: ModelUsed = "yamnet";
  if (data.model_used === "wav2vec2") modelUsedMapped = "wav2vec2";
  else if (data.model_used === "gemini") modelUsedMapped = "gemini";
  else if (data.model_used?.includes("yamnet")) modelUsedMapped = "yamnet";
  return {
    state: data.state as EmotionalState,
    confidence: data.confidence,
    emoji: data.emoji || STATE_EMOJIS[data.state as EmotionalState],
    model_used: modelUsedMapped,
    cached: false,
  };
}

export const classifyRouter = router({
  run: protectedProcedure
    .input(
      z
        .object({
          animalId: z.number().optional(),
          audio: z.string().optional(),
          audioMimeType: z.string().optional(),
          posture: z.string().optional(),
          pitch: z.number().optional(),
          spectralEnergy: z.number().optional(),
          tonalBrightness: z.number().optional(),
          contextTags: z.array(z.string()).optional(),
        })
        .refine(
          (val) => {
            if (val.audio) {
              const ALLOWED_AUDIO = [
                "audio/mpeg",
                "audio/mp3",
                "audio/wav",
                "audio/x-wav",
                "audio/mp4",
                "audio/x-m4a",
                "audio/m4a",
                "audio/aac",
                "audio/ogg",
                "audio/webm",
              ];
              const mime = val.audioMimeType || "audio/webm";
              if (!ALLOWED_AUDIO.includes(mime.toLowerCase())) return false;
              const size = (val.audio.length * 3) / 4;
              if (size > 50 * 1024 * 1024) return false; // 50MB
            }
            return true;
          },
          {
            message:
              "Ficheiro de áudio inválido ou demasiado grande. Máximo 50MB (MP3, WAV, M4A, WebM, OGG).",
          },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      checkRateLimit(ctx, "classify.run", 30);
      const userId = await effectiveUserId(ctx.user);
      await checkAndIncrementAnalysisLimit(userId);
      let result: {
        state: EmotionalState;
        confidence: number;
        emoji: string;
        model_used: ModelUsed;
        cached: boolean;
      } | null = null;

      const buffer = input.audio ? Buffer.from(input.audio, "base64") : null;
      const mime = input.audioMimeType || "audio/webm";
      let ext = "webm";
      if (mime.includes("wav")) ext = "wav";
      else if (mime.includes("mp4")) ext = "mp4";
      else if (mime.includes("ogg")) ext = "ogg";
      else if (mime.includes("mpeg")) ext = "mp3";

      if (buffer) {
        for (const backendUrl of resolveMlBackendUrls()) {
          const file = new File([buffer], `audio.${ext}`, { type: mime });
          const formData = new FormData();
          formData.append("file", file);

          const data = await tryClassifyBackend(
            backendUrl,
            formData,
            CLASSIFY_TIMEOUT_MS,
          );
          if (data) {
            const mapped = mapBackendResult(data);
            if (mapped) {
              result = mapped;
              console.log(`[Classify] Success from ${backendUrl}:`, result);
              break;
            } else {
              console.warn(
                `[Classify] ${backendUrl} returned invalid state "${data.state}", trying next.`,
              );
            }
          }
        }

        if (!result) {
          console.warn("[Classify] All ML backends failed.");
        }
      }

      if (!result) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message:
            "Não foi possível classificar o áudio neste momento. O áudio foi guardado para análise posterior.",
        });
      }

      const openId = ctx.user.openId;
      const targetAnimalId = input.animalId || 1;
      await verifyAnimalOwner(targetAnimalId, userId, true);
      const targetAnimal = await getAnimalById(targetAnimalId, userId);

      const event = await insertEvent({
        userId,
        animalId: targetAnimalId,
        state: result.state,
        confidence: result.confidence,
        emoji: result.emoji,
        modelUsed: result.model_used,
        cached: result.cached,
        contextTags: input.contextTags || [],
      });

      const eventId = (event as any)?.id;
      const eventTimestamp =
        (event as any)?.created_at ??
        (event as any)?.createdAt ??
        new Date().toISOString();

      let audioUrl = null;
      if (eventId && buffer) {
        try {
          const fileName = `${openId}/${Date.now()}-audio_${eventId}.${ext}`;
          audioUrl = await uploadAudioToSupabase(fileName, buffer, mime);
          await updateEventAudio(eventId, audioUrl);
        } catch (err) {
          console.error("[Classify] Failed to upload audio:", err);
        }
      }

      let beliefState = null;
      if (eventId) {
        const animalId = input.animalId || 1;
        beliefState = await updateBeliefStateForAnimal(
          animalId,
          result.state,
          result.confidence,
          eventId,
        );
        try {
          await recalculateAnimalBehaviorBaseline(animalId, userId);
        } catch (err) {
          console.error(
            "[Baseline] Failed to recalculate behavior baseline:",
            err,
          );
        }

        if (result.state === "distress" || result.state === "alert") {
          const animalName = targetAnimal?.name || "O seu animal";
          const stateLabel =
            result.state === "distress" ? "angústia" : "alerta";

          sendPushNotification(userId, {
            title: `AnimalMind - Alerta de ${stateLabel}!`,
            body: `${animalName} está a mostrar sinais de ${stateLabel} (${Math.round(result.confidence * 100)}% de confiança).`,
            data: {
              eventId: String(eventId),
              animalId: String(targetAnimalId),
            },
          }).catch((err) =>
            console.error(
              "[Push] Erro ao enviar notificação após classify:",
              err,
            ),
          );
        }

        if (input.posture) {
          await savePostureForEvent(eventId, input.posture);
        }

        try {
          await notifyN8N({
            userId,
            animalId: targetAnimalId,
            animalName: targetAnimal?.name ?? "Animal",
            emotionalState: result.state,
            confidence: result.confidence,
            timestamp: new Date(eventTimestamp).toISOString(),
          });
        } catch (err) {
          console.error("[n8n] Failed to send classification webhook:", err);
        }

        try {
          const animalName = targetAnimal?.name ?? "animal";
          const stateLabel = STATE_LABELS[result.state];

          await sendPushNotification(userId, {
            title: "Análise de Áudio Concluída",
            body: `A análise de áudio de ${animalName} terminou! Estado: ${stateLabel}.`,
            data: { url: "/historico", animalId: targetAnimalId },
          });

          const isCritical =
            result.state === "distress" || result.state === "alert";
          const baseline = await getAnimalBaseline(targetAnimalId);
          const baselineFrequency =
            baseline.stateDistribution?.[result.state] ?? 0;
          const isRare = baseline.sampleSize >= 5 && baselineFrequency < 0.1;

          if (isCritical || isRare) {
            const bodyText = isCritical
              ? `Alerta de Saúde: ${animalName} está com sinais de ${stateLabel}!`
              : `Alerta de Saúde: ${animalName} apresentou um estado atípico de ${stateLabel} (desvio de baseline)!`;

            await sendPushNotification(userId, {
              title: "Alerta de Saúde de IA",
              body: bodyText,
              data: { url: "/historico", animalId: targetAnimalId },
            });
          }
        } catch (pushErr) {
          console.error(
            "[Push] Falha ao enviar notificações de áudio:",
            pushErr,
          );
        }
      }

      return {
        ...result,
        eventId,
        audioUrl,
        beliefState,
        posture: input.posture || null,
      };
    }),

  getUsage: protectedProcedure.query(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    return getAnalysisUsage(userId);
  }),

  detectPosture: protectedProcedure
    .input(
      z.object({
        image: z.string().refine(
          (val) => {
            const size = (val.length * 3) / 4;
            return size <= 5 * 1024 * 1024; // 5MB
          },
          { message: "A imagem excede o tamanho máximo de 5MB." },
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      checkRateLimit(ctx, "classify.detectPosture", 45);
      const userId = await effectiveUserId(ctx.user);
      await checkAndIncrementAnalysisLimit(userId);
      const buffer = Buffer.from(input.image, "base64");
      const data = await tryVisionBackend(
        "/detect-posture",
        buffer,
        CLASSIFY_TIMEOUT_MS,
      );
      if (!data) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Detecção de postura indisponível no momento.",
        });
      }
      return data as { posture: string; confidence: number };
    }),

  detectSpecies: protectedProcedure
    .input(
      z.object({
        image: z.string().refine(
          (val) => {
            const size = (val.length * 3) / 4;
            return size <= 5 * 1024 * 1024; // 5MB
          },
          { message: "A imagem excede o tamanho máximo de 5MB." },
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      checkRateLimit(ctx, "classify.detectSpecies", 45);
      const userId = await effectiveUserId(ctx.user);
      await checkAndIncrementAnalysisLimit(userId);
      const buffer = Buffer.from(input.image, "base64");
      const data = await tryVisionBackend(
        "/detect-species",
        buffer,
        CLASSIFY_TIMEOUT_MS,
      );
      if (!data) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Detecção de espécie indisponível no momento.",
        });
      }
      return data as { species: string; confidence: number };
    }),

  classifyBreedV1: protectedProcedure
    .input(
      z.object({
        image: z.string(),
        includeInfo: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      checkRateLimit(ctx, "classify.classifyBreedV1", 45);
      const userId = await effectiveUserId(ctx.user);
      await checkAndIncrementAnalysisLimit(userId);
      const buffer = Buffer.from(input.image, "base64");

      const form = new FormData();
      const blob = new Blob([buffer], { type: "image/jpeg" });
      form.append("file", blob, "photo.jpg");

      const backends = [
        process.env.FASTAPI_BACKEND_URL,
        process.env.ML_BACKEND_URL,
        HF_BACKEND_URL,
        PRIMARY_BACKEND_URL,
      ].filter(Boolean) as string[];

      const authHeaders: Record<string, string> = {};
      if (ctx.req.headers.authorization) {
        authHeaders["Authorization"] = ctx.req.headers.authorization;
      }
      if (process.env.API_KEY) {
        authHeaders["X-API-Key"] = process.env.API_KEY;
      }

      for (const backendUrl of backends) {
        try {
          const endpoint = `/v1/classify-breed?include_info=${input.includeInfo}`;
          const res = await fetch(`${backendUrl}${endpoint}`, {
            method: "POST",
            body: form,
            headers: authHeaders,
          });
          if (res.ok) {
            return await res.json();
          }
        } catch (err) {
          console.warn(`[ML] Failed classifyBreedV1 on ${backendUrl}:`, err);
        }
      }

      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Classificação de raça v1 indisponível no momento.",
      });
    }),

  submitFeedbackV1: protectedProcedure
    .input(
      z.object({
        model_name: z.string(),
        model_version: z.string().default("v1.0.0"),
        input_hash: z.string(),
        prediction: z.string(),
        confidence: z.number(),
        is_correct: z.boolean(),
        correct_label: z.string().optional(),
        user_confidence: z.number().optional(),
        feedback_text: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
        image: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      checkRateLimit(ctx, "classify.submitFeedbackV1", 60);
      const form = new FormData();
      const { image, ...jsonData } = input;
      form.append("json_data", JSON.stringify(jsonData));

      if (image) {
        const buffer = Buffer.from(image, "base64");
        const blob = new Blob([buffer], { type: "image/jpeg" });
        form.append("image", blob, "feedback.jpg");
      }

      const backends = [
        process.env.FASTAPI_BACKEND_URL,
        process.env.ML_BACKEND_URL,
        HF_BACKEND_URL,
        PRIMARY_BACKEND_URL,
      ].filter(Boolean) as string[];

      const authHeaders: Record<string, string> = {};
      if (ctx.req.headers.authorization) {
        authHeaders["Authorization"] = ctx.req.headers.authorization;
      }
      if (process.env.API_KEY) {
        authHeaders["X-API-Key"] = process.env.API_KEY;
      }

      for (const backendUrl of backends) {
        try {
          const res = await fetch(`${backendUrl}/v1/feedback`, {
            method: "POST",
            body: form,
            headers: authHeaders,
          });
          if (res.ok) {
            return await res.json();
          }
        } catch (err) {
          console.warn(`[ML] Failed submitFeedbackV1 on ${backendUrl}:`, err);
        }
      }

      return { status: "fallback", id: "local-" + Date.now() };
    }),

  saveVisionEvent: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        posture: z.string(),
        species: z.string().optional().nullable(),
        image: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let state:
        | "relaxed"
        | "distress"
        | "attention"
        | "hunger"
        | "alert"
        | "excitement" = "relaxed";
      let emoji = "😌";
      const p = input.posture.toLowerCase();

      if (
        p.includes("sleep") ||
        p.includes("lie") ||
        p.includes("lying") ||
        p.includes("sitting") ||
        p.includes("sit")
      ) {
        state = "relaxed";
        emoji = "😌";
      } else if (
        p.includes("stand") ||
        p.includes("standing") ||
        p.includes("walk") ||
        p.includes("run")
      ) {
        state = "alert";
        emoji = "👀";
      } else if (
        p.includes("play") ||
        p.includes("jump") ||
        p.includes("excited")
      ) {
        state = "excitement";
        emoji = "🤪";
      } else if (
        p.includes("beg") ||
        p.includes("begging") ||
        p.includes("food")
      ) {
        state = "hunger";
        emoji = "😋";
      } else if (
        p.includes("cower") ||
        p.includes("fear") ||
        p.includes("hide") ||
        p.includes("distress")
      ) {
        state = "distress";
        emoji = "😰";
      } else if (
        p.includes("bark") ||
        p.includes("growl") ||
        p.includes("attention")
      ) {
        state = "attention";
        emoji = "🥺";
      }

      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);
      const targetAnimal = await getAnimalById(input.animalId, userId);

      const event = await insertEvent({
        userId,
        animalId: input.animalId,
        state,
        confidence: 0.9,
        emoji,
        modelUsed: "YOLOv8-Vision",
        cached: false,
      });

      const eventId = (event as any)?.id;
      if (eventId) {
        await savePostureForEvent(eventId, input.posture);
        await updateBeliefStateForAnimal(input.animalId, state, 0.9, eventId);
        try {
          await recalculateAnimalBehaviorBaseline(input.animalId, userId);
        } catch (err) {
          console.error(
            "[Baseline] Failed to recalculate behavior baseline:",
            err,
          );
        }

        try {
          const animalName = targetAnimal?.name ?? "animal";
          const stateLabel = STATE_LABELS[state];

          await sendPushNotification(userId, {
            title: "Análise de Vídeo Concluída",
            body: `A análise de vídeo de ${animalName} terminou! Postura: ${input.posture}.`,
            data: { url: "/historico", animalId: input.animalId },
          });

          const isCritical = state === "distress" || state === "alert";
          const baseline = await getAnimalBaseline(input.animalId);
          const baselineFrequency = baseline.stateDistribution?.[state] ?? 0;
          const isRare = baseline.sampleSize >= 5 && baselineFrequency < 0.1;

          if (isCritical || isRare) {
            const bodyText = isCritical
              ? `Alerta de Saúde: ${animalName} está com sinais de ${stateLabel}!`
              : `Alerta de Saúde: ${animalName} apresentou um estado atípico de ${stateLabel} (desvio de baseline)!`;

            await sendPushNotification(userId, {
              title: "Alerta de Saúde de IA",
              body: bodyText,
              data: { url: "/historico", animalId: input.animalId },
            });
          }
        } catch (pushErr) {
          console.error(
            "[Push] Falha ao enviar notificações de vídeo:",
            pushErr,
          );
        }
      }

      return {
        state,
        confidence: 0.9,
        emoji,
        model_used: "YOLOv8-Vision",
        eventId,
      };
    }),
});
