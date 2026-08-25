import { animate, useMotionValue } from "motion/react";
import { useEffect, useRef } from "react";
import type { EmotionalState } from "../../../../shared/types";

export function getHealthBadge(state?: EmotionalState | string | null) {
  if (!state) {
    return {
      label: "Sem dados",
      className: "border-slate-700/70 bg-slate-800/70 text-slate-300",
    };
  }

  if (state === "distress" || state === "alert") {
    return {
      label: "Atenção",
      className: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    };
  }

  if (state === "hunger" || state === "attention") {
    return {
      label: "Monitorizar",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    };
  }

  return {
    label: "Estável",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };
}

export function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{payload[0]?.value}</p>
    </div>
  );
}

export function ConfidenceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-primary">
        {Math.round((payload[0]?.value ?? 0) * 100)}%
      </p>
    </div>
  );
}

export function AnimatedNumber({ value }: { value: number }) {
  const count = useMotionValue(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    count.set(0);
    const controls = animate(count, value, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (latest: number) => {
        if (spanRef.current) {
          spanRef.current.textContent = String(Math.round(latest));
        }
      },
    });
    return () => controls.stop();
  }, [value, count]);

  return <span ref={spanRef}>0</span>;
}
