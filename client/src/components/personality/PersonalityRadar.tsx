// client/src/components/personality/PersonalityRadar.tsx
// Inspiração 5 – SVG radar chart for the 5 behavioral dimensions.
//
// Pure SVG – no recharts or external charting libraries.
// Wrapped in React.memo to avoid re-renders when parent re-renders.
//
// Design:
// - Pentagon (5-axis) radar with 4 ring levels (1, 2, 3, 4, 5)
// - Filled polygon for current score; dashed circle for baseline (score=3)
// - Axis labels with emoji and dimension name
// - Provisional overlay when confidence < PROVISIONAL_THRESHOLD

import React, { memo, useMemo } from "react";
import type { AnimalPersonality } from "../../../../shared/personality";
import {
  DIMENSION_META,
  PERSONALITY_DIMENSIONS,
  PROVISIONAL_THRESHOLD,
} from "../../../../shared/personality";

// ─── Geometry helpers ─────────────────────────────────────────────────────────

const SIZE = 280; // SVG viewBox size
const CENTER = SIZE / 2;
const MAX_RADIUS = 100; // Radius for score = 5
const LEVELS = 4; // Concentric rings

/** Convert polar → cartesian. angle in radians from top (−π/2). */
function polarToXY(
  angle: number,
  radius: number,
): { x: number; y: number } {
  return {
    x: CENTER + radius * Math.cos(angle - Math.PI / 2),
    y: CENTER + radius * Math.sin(angle - Math.PI / 2),
  };
}

/** Score 1–5 → radius 0–MAX_RADIUS */
function scoreToRadius(score: number): number {
  return ((score - 1) / 4) * MAX_RADIUS;
}

/** Build SVG polygon points string from score array */
function buildPolygonPoints(scores: number[]): string {
  const n = scores.length;
  return scores
    .map((score, i) => {
      const angle = (2 * Math.PI * i) / n;
      const { x, y } = polarToXY(angle, scoreToRadius(score));
      return `${x},${y}`;
    })
    .join(" ");
}

/** Build SVG polygon points for a given fixed radius */
function buildRingPoints(n: number, radius: number): string {
  return Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n;
    const { x, y } = polarToXY(angle, radius);
    return `${x},${y}`;
  }).join(" ");
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PersonalityRadarProps {
  personality: AnimalPersonality;
  /** If true, shows a subtle label "Análise em curso…" overlay. */
  provisional?: boolean;
  className?: string;
}

export const PersonalityRadar = memo(function PersonalityRadar({
  personality,
  provisional,
  className = "",
}: PersonalityRadarProps) {
  const n = PERSONALITY_DIMENSIONS.length; // 5

  const scores = useMemo(
    () =>
      PERSONALITY_DIMENSIONS.map((dim) => personality[dim] as number),
    [personality],
  );

  const isProvisional =
    provisional ?? personality.confidence < PROVISIONAL_THRESHOLD;

  // Axis endpoints at max radius (score=5)
  const axisEndpoints = useMemo(
    () =>
      PERSONALITY_DIMENSIONS.map((_, i) => {
        const angle = (2 * Math.PI * i) / n;
        return polarToXY(angle, MAX_RADIUS);
      }),
    [n],
  );

  // Label positions (slightly beyond max radius)
  const LABEL_OFFSET = 28;
  const labelPositions = useMemo(
    () =>
      PERSONALITY_DIMENSIONS.map((_, i) => {
        const angle = (2 * Math.PI * i) / n;
        return polarToXY(angle, MAX_RADIUS + LABEL_OFFSET);
      }),
    [n],
  );

  // Concentric ring polygons
  const rings = useMemo(
    () =>
      Array.from({ length: LEVELS }, (_, lvl) => {
        const score = ((lvl + 1) / LEVELS) * 4 + 1; // 2, 3, 4, 5
        return buildRingPoints(n, scoreToRadius(score));
      }),
    [n],
  );

  const filledPoints = useMemo(() => buildPolygonPoints(scores), [scores]);
  // Baseline = neutral (score 3)
  const baselinePoints = useMemo(() => buildRingPoints(n, scoreToRadius(3)), [n]);

  return (
    <div className={`relative select-none ${className}`} role="img"
      aria-label="Radar de personalidade comportamental">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width="100%"
        height="100%"
        className="overflow-visible"
      >
        {/* ── Background rings ─────────────────────────────────────── */}
        {rings.map((pts, i) => (
          <polygon
            key={i}
            points={pts}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            className="text-border"
            opacity={0.35 + i * 0.1}
          />
        ))}

        {/* ── Axis spokes ──────────────────────────────────────────── */}
        {axisEndpoints.map(({ x, y }, i) => (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={x}
            y2={y}
            stroke="currentColor"
            strokeWidth="0.8"
            className="text-border"
            opacity={0.5}
          />
        ))}

        {/* ── Baseline polygon (score=3, dashed) ───────────────────── */}
        <polygon
          points={baselinePoints}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 3"
          className="text-muted-foreground"
          opacity={0.5}
        />

        {/* ── Filled score polygon ─────────────────────────────────── */}
        <polygon
          points={filledPoints}
          fill="var(--primary)"
          fillOpacity={isProvisional ? 0.12 : 0.22}
          stroke="var(--primary)"
          strokeWidth={isProvisional ? 1.5 : 2}
          strokeDasharray={isProvisional ? "5 3" : undefined}
        />

        {/* ── Score dots on each axis ──────────────────────────────── */}
        {scores.map((score, i) => {
          const angle = (2 * Math.PI * i) / n;
          const { x, y } = polarToXY(angle, scoreToRadius(score));
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={4}
              fill="var(--primary)"
              opacity={isProvisional ? 0.5 : 1}
            />
          );
        })}

        {/* ── Axis labels ──────────────────────────────────────────── */}
        {PERSONALITY_DIMENSIONS.map((dim, i) => {
          const { x, y } = labelPositions[i];
          const meta = DIMENSION_META[dim];
          // Anchor: center for top/bottom, left/right otherwise
          let anchor: "start" | "middle" | "end" = "middle";
          if (x < CENTER - 10) anchor = "end";
          else if (x > CENTER + 10) anchor = "start";

          return (
            <g key={dim}>
              <text
                x={x}
                y={y - 7}
                textAnchor={anchor}
                fontSize="14"
                dominantBaseline="middle"
              >
                {meta.emoji}
              </text>
              <text
                x={x}
                y={y + 9}
                textAnchor={anchor}
                fontSize="9"
                dominantBaseline="middle"
                fill="currentColor"
                className="text-muted-foreground"
                fontFamily="inherit"
              >
                {meta.fallbackPt}
              </text>
            </g>
          );
        })}

        {/* ── Score value labels (inside polygon) ──────────────────── */}
        {scores.map((score, i) => {
          const angle = (2 * Math.PI * i) / n;
          // Place value label halfway between center and dot
          const r = scoreToRadius(score) * 0.5;
          const { x, y } = polarToXY(angle, r);
          if (score === 3) return null; // don't clutter neutral dots
          return (
            <text
              key={`score-${i}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="9"
              fontWeight="bold"
              fill="var(--primary)"
              opacity={0.85}
              fontFamily="inherit"
            >
              {score}
            </text>
          );
        })}
      </svg>

      {/* Provisional overlay */}
      {isProvisional && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="rounded-full bg-background/80 backdrop-blur-sm px-3 py-1 text-[10px] text-muted-foreground border border-border">
            A analisar…
          </span>
        </div>
      )}
    </div>
  );
});
