import { Capacitor } from "@capacitor/core";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { ForegroundService } from "@capawesome-team/capacitor-android-foreground-service";
import { VoiceRecorder } from "capacitor-voice-recorder";
import {
  Activity,
  PlayCircle,
  Shield,
  ShieldAlert,
  StopCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

// ─── Surveillance configuration ───────────────────────────────────────────────
/** Duration of each audio recording chunk. */
const RECORD_DURATION_MS = 5_000;
/** Idle pause between cycles — lets CPU/radio enter low-power state. Increased for better battery. */
const ANALYSIS_PAUSE_MS = 10_000;

export function SurveillancePage() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Inativo");
  const classifyMutation = trpc.classify.run.useMutation();
  const loopRef = useRef<boolean>(false);
  /** Stores the active setTimeout handle so we can cancel it on stop. */
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSurveillance();
    };
  }, []);

  const startSurveillance = async () => {
    if (!Capacitor.isNativePlatform()) {
      alert(
        "O Modo Vigilância apenas funciona em dispositivos móveis Android/iOS.",
      );
      return;
    }

    try {
      const hasPermission = await VoiceRecorder.hasAudioRecordingPermission();
      if (!hasPermission.value) {
        const request = await VoiceRecorder.requestAudioRecordingPermission();
        if (!request.value) {
          alert("Permissão de microfone negada.");
          return;
        }
      }

      await KeepAwake.keepAwake();
      if (Capacitor.getPlatform() === "android") {
        await ForegroundService.startForegroundService({
          id: 1,
          title: "PeloNaRoupa",
          body: "Modo Vigilância ativo (escutando ambiente...)",
          smallIcon: "ic_stat_name",
        });
      }

      setIsActive(true);
      loopRef.current = true;
      setStatus("A gravar...");
      surveillanceLoop();
    } catch (e) {
      console.error(e);
      alert("Erro ao iniciar vigilância.");
    }
  };

  const stopSurveillance = async () => {
    loopRef.current = false;
    setIsActive(false);
    setStatus("Inativo");

    // Cancel any pending idle timer immediately
    if (stopTimerRef.current !== null) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await KeepAwake.allowSleep();
        if (Capacitor.getPlatform() === "android") {
          await ForegroundService.stopForegroundService();
        }
        const recStatus = await VoiceRecorder.getCurrentStatus();
        if (recStatus.status === "RECORDING") {
          await VoiceRecorder.stopRecording();
        }
      }
    } catch (e) {
      console.error("[Surveillance] Error stopping:", e);
    }
  };

  /**
   * Recursive surveillance loop.
   * Uses setTimeout-based recursion (not while-true) so the JS engine
   * can breathe between iterations and the CPU can enter low-power state.
   */
  const surveillanceLoop = useCallback(async () => {
    if (!loopRef.current) return;

    try {
      setStatus("A gravar...");
      await VoiceRecorder.startRecording();

      // Wait for the record duration, storing the handle so stopSurveillance
      // can cancel it immediately without waiting.
      await new Promise<void>((resolve) => {
        stopTimerRef.current = setTimeout(() => {
          stopTimerRef.current = null;
          resolve();
        }, RECORD_DURATION_MS);
      });

      // Guard: user may have pressed stop during recording
      if (!loopRef.current) {
        await VoiceRecorder.stopRecording().catch(() => {});
        return;
      }

      const result = await VoiceRecorder.stopRecording();
      setStatus("A analisar...");

      if (result.value?.recordDataBase64) {
        let base64Audio: string | null = result.value.recordDataBase64;
        const mime = result.value.mimeType;
        try {
          await classifyMutation.mutateAsync({
            audio: base64Audio,
            audioMimeType: mime,
          });
        } catch (classifyErr) {
          // Classification errors don't stop the surveillance loop
          console.error(
            "[Surveillance] Classify error (continuing):",
            classifyErr,
          );
        } finally {
          // Explicit cleanup to help the JS Garbage Collector
          // clear the massive base64 string from memory immediately
          base64Audio = null;
          result.value.recordDataBase64 = "";
        }
      }
    } catch (e) {
      console.error("[Surveillance] Loop error:", e);
      setStatus("Erro — a reiniciar...");
      // Brief pause after error before retrying
      await new Promise<void>((resolve) => {
        stopTimerRef.current = setTimeout(() => {
          stopTimerRef.current = null;
          resolve();
        }, 2_000);
      });
    }

    if (loopRef.current) {
      // ── Idle pause ────────────────────────────────────────────────────────
      // This is the key battery optimization: giving the CPU and radio
      // time to enter a low-power state between recording cycles.
      setStatus("Em espera...");
      await new Promise<void>((resolve) => {
        stopTimerRef.current = setTimeout(() => {
          stopTimerRef.current = null;
          resolve();
        }, ANALYSIS_PAUSE_MS);
      });
      // Tail-call: schedule next iteration without growing the call stack
      surveillanceLoop();
    }
  }, [classifyMutation]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center space-y-6">
      <div
        className={`p-8 rounded-full ${isActive ? "bg-red-100 animate-pulse" : "bg-slate-100"}`}
      >
        {isActive ? (
          <ShieldAlert className="w-24 h-24 text-red-600" />
        ) : (
          <Shield className="w-24 h-24 text-slate-400" />
        )}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Modo Vigilância</h1>
        <p className="text-slate-500 max-w-sm">
          Deixe este dispositivo em casa. A PeloNaRoupa irá escutar
          continuamente e alertar o seu telemóvel principal se detetar latidos
          ou miados anormais.
        </p>
      </div>

      <div className="flex items-center space-x-2 text-sm font-medium">
        <Activity
          className={`w-4 h-4 ${isActive ? "text-red-500 animate-bounce" : "text-slate-400"}`}
        />
        <span className={isActive ? "text-red-600" : "text-slate-500"}>
          Estado: {status}
        </span>
      </div>

      {Capacitor.getPlatform() === "android" && (
        <Alert
          variant="default"
          className="w-full max-w-sm mb-4 border-yellow-500/50 bg-yellow-500/10"
        >
          <ShieldAlert className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-500">
            Otimização de Bateria
          </AlertTitle>
          <AlertDescription className="text-muted-foreground text-xs mt-1">
            Para que a vigilância funcione a noite toda, vá a Definições {">"}{" "}
            Bateria e defina o uso desta App como "Sem restrições
            (Unrestricted)".
          </AlertDescription>
        </Alert>
      )}

      <Button
        size="lg"
        className={`w-full max-w-xs ${isActive ? "bg-red-600 hover:bg-red-700" : "bg-slate-900"}`}
        onClick={isActive ? stopSurveillance : startSurveillance}
      >
        {isActive ? (
          <>
            <StopCircle className="w-5 h-5 mr-2" />
            Parar Vigilância
          </>
        ) : (
          <>
            <PlayCircle className="w-5 h-5 mr-2" />
            Iniciar Vigilância
          </>
        )}
      </Button>
    </div>
  );
}
