// client/src/components/personality/PersonalityCard.tsx
// Inspiração 5 – Full personality profile card.
//
// Displays:
// - PersonalityRadar (SVG, no external deps)
// - 5 dimension bars with score + label
// - Confidence badge + "Análise provisional" banner
// - Expandable override panel for tutor adjustments
// - POMDP context note: shows how the profile refines the model
//
// Accessibility: region landmark, focus management for accordion.

import React, { memo, useCallback, useId, useState } from "react";
import type { AnimalPersonality } from "../../../../shared/personality";
import {
  DIMENSION_META,
  PERSONALITY_DIMENSIONS,
  PROVISIONAL_THRESHOLD,
  type PersonalityDimension,
} from "../../../../shared/personality";
import { PersonalityRadar } from "./PersonalityRadar";

// ─── Sub-components ───────────────────────────────────────────────────────────

interface DimensionBarProps {
  dim: PersonalityDimension;
  score: number;
  confidence: number;
}

const DimensionBar = memo(function DimensionBar({
  dim,
  score,
  confidence,
}: DimensionBarProps) {
  const meta = DIMENSION_META[dim];
  const isProvisional = confidence < PROVISIONAL_THRESHOLD;
  const pct = ((score - 1) / 4) * 100;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-5 text-center" aria-hidden="true">
        {meta.emoji}
      </span>
      <span className="w-36 truncate text-muted-foreground text-xs">
        {meta.fallbackPt}
      </span>
      <div
        className="flex-1 relative h-2 rounded-full bg-muted overflow-hidden"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={1}
        aria-valuemax={5}
        aria-label={meta.fallbackPt}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            backgroundColor: isProvisional
              ? "var(--muted-foreground)"
              : "var(--primary)",
            opacity: isProvisional ? 0.4 : 1,
          }}
        />
      </div>
      <span
        className="w-4 text-right text-xs font-semibold"
        style={{ color: isProvisional ? "var(--muted-foreground)" : "var(--primary)" }}
      >
        {score}
      </span>
    </div>
  );
});

// ─── Dimension slider for override panel ──────────────────────────────────────

interface OverrideSliderProps {
  dim: PersonalityDimension;
  currentScore: number;
  onChange: (dim: PersonalityDimension, value: number) => void;
}

const OverrideSlider = memo(function OverrideSlider({
  dim,
  currentScore,
  onChange,
}: OverrideSliderProps) {
  const meta = DIMENSION_META[dim];
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <span aria-hidden="true">{meta.emoji}</span>
        {meta.fallbackPt}
        <span className="ml-auto font-semibold text-foreground">
          {currentScore}/5
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={1}
        max={5}
        step={1}
        value={currentScore}
        onChange={(e) => onChange(dim, Number(e.target.value))}
        className="w-full h-1.5 accent-primary rounded-full cursor-pointer"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={currentScore}
      />
    </div>
  );
});

// ─── Main card ────────────────────────────────────────────────────────────────

interface PersonalityCardProps {
  personality: AnimalPersonality;
  animalName?: string;
  /** Called when tutor saves dimension overrides */
  onOverride?: (dims: Partial<Record<PersonalityDimension, number>>) => Promise<void>;
  /** Called to trigger full recalculation */
  onRecalculate?: () => Promise<void>;
  isLoading?: boolean;
}

export const PersonalityCard = memo(function PersonalityCard({
  personality,
  animalName = "o animal",
  onOverride,
  onRecalculate,
  isLoading = false,
}: PersonalityCardProps) {
  const isProvisional = personality.confidence < PROVISIONAL_THRESHOLD;

  // Override panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [overrides, setOverrides] = useState<Record<PersonalityDimension, number>>(
    () =>
      Object.fromEntries(
        PERSONALITY_DIMENSIONS.map((d) => [d, personality[d] as number]),
      ) as Record<PersonalityDimension, number>,
  );
  const [saving, setSaving] = useState(false);
  const [recalcing, setRecalcing] = useState(false);

  const panelId = useId();

  const handleSliderChange = useCallback(
    (dim: PersonalityDimension, value: number) => {
      setOverrides((prev) => ({ ...prev, [dim]: value }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!onOverride) return;
    setSaving(true);
    try {
      await onOverride(overrides);
      setPanelOpen(false);
    } finally {
      setSaving(false);
    }
  }, [onOverride, overrides]);

  const handleRecalculate = useCallback(async () => {
    if (!onRecalculate) return;
    setRecalcing(true);
    try {
      await onRecalculate();
    } finally {
      setRecalcing(false);
    }
  }, [onRecalculate]);

  // Source badge
  const sourceLabel =
    personality.source === "user"
      ? "Manual"
      : personality.source === "blended"
        ? "Misto"
        : "Inferido";

  const confidencePct = Math.round(personality.confidence * 100);

  return (
    <section
      aria-label={`Perfil de personalidade de ${animalName}`}
      className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            🧠 Perfil de Personalidade
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            70% inferido de {personality.eventsUsed} classificações
            {personality.source !== "inferred" && " · 30% ajustado pelo tutor"}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          {/* Confidence badge */}
          <span
            className={`text-[10px] rounded-full px-2 py-0.5 border font-medium ${
              isProvisional
                ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                : "border-primary/30 bg-primary/10 text-primary"
            }`}
          >
            {isProvisional ? `Provisional ${confidencePct}%` : `${confidencePct}% confiança`}
          </span>
          {/* Source badge */}
          <span className="text-[9px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
            {sourceLabel}
          </span>
        </div>
      </div>

      {/* Provisional notice */}
      {isProvisional && (
        <div
          role="status"
          aria-live="polite"
          className="mx-4 mb-2 rounded-lg bg-amber-500/8 border border-amber-500/20 px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400"
        >
          ⚠️ Perfil ainda em construção — são necessárias mais classificações
          para resultados definitivos.
        </div>
      )}

      {/* POMDP context note */}
      <div className="mx-4 mb-3 rounded-lg bg-muted/50 px-3 py-2 text-[10px] text-muted-foreground leading-relaxed">
        💡 Este perfil ajusta os <em>priors</em> do modelo de inferência
        emocional — um animal com alta expressividade vocal tem o limiar de
        "angústia" recalibrado automaticamente.
      </div>

      {/* Radar + dimension bars */}
      <div className="px-4 pb-3 flex flex-col sm:flex-row gap-4">
        {/* Radar */}
        <div className="w-full sm:w-48 shrink-0 flex items-center justify-center">
          <PersonalityRadar
            personality={personality}
            className="w-48 h-48"
          />
        </div>

        {/* Dimension bars */}
        <div className="flex-1 flex flex-col justify-center gap-3">
          {PERSONALITY_DIMENSIONS.map((dim) => (
            <DimensionBar
              key={dim}
              dim={dim}
              score={personality[dim] as number}
              confidence={personality.confidence}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 pb-4">
        {onOverride && (
          <button
            type="button"
            aria-expanded={panelOpen}
            aria-controls={panelId}
            onClick={() => setPanelOpen((v) => !v)}
            className="flex-1 text-xs rounded-lg border border-border py-1.5 px-3 text-foreground hover:bg-muted transition-colors duration-150"
          >
            {panelOpen ? "Fechar ajustes" : "✏️ Ajustar manualmente"}
          </button>
        )}
        {onRecalculate && (
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalcing || isLoading}
            className="text-xs rounded-lg border border-border py-1.5 px-3 text-muted-foreground hover:bg-muted transition-colors duration-150 disabled:opacity-50"
            title="Reinferir a partir dos dados mais recentes"
          >
            {recalcing ? "⏳" : "🔄"}
          </button>
        )}
      </div>

      {/* Override panel */}
      {panelOpen && onOverride && (
        <div
          id={panelId}
          className="border-t border-border px-4 pt-3 pb-4 flex flex-col gap-3"
          aria-label="Painel de ajuste manual de dimensões"
        >
          <p className="text-xs text-muted-foreground">
            Ajusta o que sentes que a IA ainda não captou completamente.
          </p>
          {PERSONALITY_DIMENSIONS.map((dim) => (
            <OverrideSlider
              key={dim}
              dim={dim}
              currentScore={overrides[dim]}
              onChange={handleSliderChange}
            />
          ))}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="flex-1 text-xs rounded-lg border border-border py-1.5 text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 text-xs rounded-lg bg-primary text-primary-foreground py-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "A guardar…" : "Guardar ajustes"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
});
