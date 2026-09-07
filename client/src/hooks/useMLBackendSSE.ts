/**
 * useMLBackendSSE
 *
 * Connects to the FastAPI /sse endpoint and listens for real-time
 * classification events. Displays toast notifications when a new
 * classification result arrives from the ML backend.
 *
 * This complements the Supabase Realtime hook (useRealtimeNotifications)
 * which handles DB-persisted events. This hook provides immediate feedback
 * directly from the ML inference pipeline (useful for long classifications).
 *
 * Authentication:
 * The /sse endpoint is protected by Bearer JWT (Depends(get_current_user)).
 * The native EventSource API does NOT support custom headers, so we use
 * @microsoft/fetch-event-source which uses the Fetch API under the hood and
 * fully supports Authorization headers. This avoids exposing tokens in URLs.
 */

import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// The ML backend URL – falls back to the Fly.io primary backend.
const ML_BACKEND_BASE =
  import.meta.env.VITE_ML_BACKEND_URL ??
  import.meta.env.VITE_API_URL ??
  "https://animalmind-backend.fly.dev";

type ClassificationEvent = {
  type: "classification";
  ts: string;
  data: {
    state: string;
    confidence: number;
    emoji: string;
    model_used: string;
  };
};

type SSEEvent =
  | ClassificationEvent
  | { type: string; ts: string; data: unknown };

const STATE_LABELS_PT: Record<string, string> = {
  distress: "Angústia",
  attention: "Atenção",
  excitement: "Excitação",
  hunger: "Fome",
  alert: "Alerta",
  relaxed: "Relaxado",
};

const STATE_LABELS_EN: Record<string, string> = {
  distress: "Distress",
  attention: "Attention",
  excitement: "Excitement",
  hunger: "Hunger",
  alert: "Alert",
  relaxed: "Relaxed",
};

export interface UseMLBackendSSEOptions {
  /** Whether the SSE connection should be active. Defaults to true. */
  enabled?: boolean;
  /** Display language for toast messages. Defaults to "pt". */
  language?: "pt" | "en";
  /**
   * Called when a classification event arrives.
   * If provided, the default toast is suppressed.
   */
  onClassification?: (event: ClassificationEvent["data"]) => void;
}

// Custom error to signal intentional abort (no reconnect)
class AbortError extends Error {}

export function useMLBackendSSE({
  enabled = true,
  language = "pt",
  onClassification,
}: UseMLBackendSSEOptions = {}) {
  // We use a ref to the AbortController so we can cancel the connection on unmount/disable.
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Get the current Supabase session token from the auth context.
  const { session } = useAuth();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Only connect when we have a valid session token.
    // This prevents unauthenticated connections on public routes.
    const token = session?.access_token;
    if (!token) return;

    let isCancelled = false;

    function connect() {
      if (!isMountedRef.current || isCancelled) return;

      const url = `${ML_BACKEND_BASE}/sse`;

      // Create a new AbortController for each connection attempt.
      const controller = new AbortController();
      abortControllerRef.current = controller;

      fetchEventSource(url, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        // openWhenHidden: keep the SSE alive when the tab is hidden (background monitoring)
        openWhenHidden: true,

        onopen: async (response) => {
          if (response.ok && response.status === 200) {
            // Connection established successfully
            return;
          }
          if (response.status === 401) {
            // Auth error — do not reconnect (token invalid or expired)
            throw new AbortError(
              `SSE: 401 Unauthorized — session may have expired.`,
            );
          }
          if (response.status >= 500) {
            // Server error — reconnect with backoff
            throw new Error(`SSE: server error ${response.status}`);
          }
        },

        onmessage: (event) => {
          if (event.event === "connected") {
            // Initial heartbeat from server — ignore
            return;
          }

          try {
            const parsed = JSON.parse(event.data) as SSEEvent;

            if (parsed.type === "classification") {
              const { data } = parsed as ClassificationEvent;

              if (onClassification) {
                onClassification(data);
                return;
              }

              const stateLabel =
                language === "pt"
                  ? (STATE_LABELS_PT[data.state] ?? data.state)
                  : (STATE_LABELS_EN[data.state] ?? data.state);

              const confidence = Math.round(data.confidence * 100);
              const message =
                language === "pt"
                  ? `${data.emoji} ${stateLabel} — ${confidence}% confiança`
                  : `${data.emoji} ${stateLabel} — ${confidence}% confidence`;

              toast.info(message, {
                id: "ml-sse-classification",
                duration: 5000,
              });
            }
          } catch {
            // Non-JSON keep-alive comments are silently ignored (": keepalive" pings)
          }
        },

        onerror: (error) => {
          if (error instanceof AbortError) {
            // Intentional abort (auth failure or unmount) — stop reconnecting
            throw error;
          }
          // For transient errors, fetchEventSource will automatically retry.
          // We log in dev but don't throw — let the library handle reconnection.
          if (import.meta.env.DEV) {
            console.debug("[SSE] connection error, will retry:", error);
          }
        },

        onclose: () => {
          // Server closed the connection — schedule reconnect if still mounted
          if (!isMountedRef.current || isCancelled) return;
          reconnectTimerRef.current = setTimeout(connect, 10_000);
        },
      }).catch((err) => {
        // fetchEventSource throws only when we rethrow from onerror or onopen
        // (e.g. AbortError for auth failures). Log in dev.
        if (import.meta.env.DEV && !(err instanceof AbortError)) {
          console.debug("[SSE] fatal error:", err);
        }
      });
    }

    connect();

    return () => {
      isCancelled = true;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [enabled, language, onClassification, session?.access_token]);
}
