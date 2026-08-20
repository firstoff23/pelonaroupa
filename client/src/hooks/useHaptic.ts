import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { useCallback } from "react";

export function useHaptic() {
  const vibrate = useCallback(async (pattern: number | number[]) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
        console.warn("[Haptic] Capacitor vibration failed:", e);
      }
    } else if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        console.warn("[Haptic] Web vibration failed/blocked:", e);
      }
    }
  }, []);

  const triggerStartRecording = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else {
      vibrate(50);
    }
  }, [vibrate]);

  const triggerStopRecording = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else {
      vibrate([50, 50, 50]);
    }
  }, [vibrate]);

  const triggerSaveSuccess = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({ type: NotificationType.Success });
    } else {
      vibrate(30);
    }
  }, [vibrate]);

  const triggerCriticalError = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({ type: NotificationType.Error });
    } else {
      vibrate(200);
    }
  }, [vibrate]);

  return {
    vibrate,
    triggerStartRecording,
    triggerStopRecording,
    triggerSaveSuccess,
    triggerCriticalError,
  };
}
