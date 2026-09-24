// server/services/personality.ts
// Inspiração 5 – Perfil de Personalidade
//
// Pure inference service: reads classification_events, computes personality
// dimension scores, and upserts to animal_personalities.
//
// Design decisions:
// - No external deps; all arithmetic in TypeScript.
// - Each dimension derived from observable event distributions.
// - confidence = f(events_used) – capped at 1.0, rises with √N for stability.
// - Called after every classify.run (low cost; upsert is idempotent).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmotionalState } from "../../shared/types";
import type { AnimalPersonality } from "../../shared/personality";
import { MIN_EVENTS_FOR_CONFIDENCE } from "../../shared/personality";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventRow {
  state: EmotionalState;
  confidence: number;
  created_at: string;
}

interface RawDistribution {
  distress: number;
  alert: number;
  hunger: number;
  attention: number;
  excitement: number;
  relaxed: number;
  total: number;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Infer personality dimensions from the last `maxEvents` classification events
 * for an animal, then upsert into animal_personalities.
 *
 * Skips inference silently if fewer than 5 events exist (too noisy).
 */
export async function inferAndSavePersonality(
  supabase: SupabaseClient<any>,
  animalId: number,
  maxEvents = 500,
): Promise<void> {
  // 1. Fetch recent events
  const { data: rows, error } = await supabase
    .from("classification_events")
    .select("state, confidence, created_at")
    .eq("animal_id", animalId)
    .order("created_at", { ascending: false })
    .limit(maxEvents);

  if (error || !rows || rows.length < 5) return;

  const events: EventRow[] = rows;
  const dist = buildDistribution(events);
  const profile = computeDimensions(dist, events);

  await upsertPersonality(supabase, animalId, profile, dist.total);
}

/**
 * Load personality profile for a given animal. Returns null if not yet
 * computed (caller should fall back to DEFAULT_PERSONALITY).
 */
export async function getPersonality(
  supabase: SupabaseClient<any>,
  animalId: number,
): Promise<AnimalPersonality | null> {
  const { data, error } = await supabase
    .from("animal_personalities")
    .select("*")
    .eq("animal_id", animalId)
    .single();

  if (error || !data) return null;

  return mapRow(data, animalId);
}

/**
 * Apply a partial user override to the personality profile.
 * source becomes 'blended'. Only provided dimensions are overwritten.
 */
export async function applyUserOverride(
  supabase: SupabaseClient<any>,
  animalId: number,
  overrides: Partial<Record<string, number>>,
): Promise<AnimalPersonality> {
  // Get current row or start fresh
  const { data: current } = await supabase
    .from("animal_personalities")
    .select("*")
    .eq("animal_id", animalId)
    .single();

  const update: Record<string, any> = {
    animal_id: animalId,
    source: "blended",
    updated_at: new Date().toISOString(),
  };

  const colMap: Record<string, string> = {
    vocalExpressiveness: "vocal_expressiveness",
    stressResilience: "stress_resilience",
    energyLevel: "energy_level",
    sociability: "sociability",
    independence: "independence",
  };

  // Merge: keep inferred values for dimensions not in overrides
  if (current) {
    update.vocal_expressiveness = current.vocal_expressiveness;
    update.stress_resilience = current.stress_resilience;
    update.energy_level = current.energy_level;
    update.sociability = current.sociability;
    update.independence = current.independence;
    update.confidence = current.confidence;
    update.events_used = current.events_used;
  }

  for (const [key, val] of Object.entries(overrides)) {
    const col = colMap[key];
    if (col && typeof val === "number" && val >= 1 && val <= 5) {
      update[col] = Math.round(val);
    }
  }

  const { data, error } = await supabase
    .from("animal_personalities")
    .upsert(update, { onConflict: "animal_id" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to save personality override: ${error?.message}`);
  }

  return mapRow(data, animalId);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function buildDistribution(events: EventRow[]): RawDistribution {
  const dist: RawDistribution = {
    distress: 0,
    alert: 0,
    hunger: 0,
    attention: 0,
    excitement: 0,
    relaxed: 0,
    total: events.length,
  };
  for (const e of events) {
    const st = e.state as keyof Omit<RawDistribution, "total">;
    if (st in dist) (dist[st] as number)++;
  }
  return dist;
}

/**
 * Compute dimension scores 1–5 from event distribution.
 *
 * Mapping rationale:
 * - vocalExpressiveness  → high distress + excitement frequency → more vocal
 * - stressResilience     → low distress frequency + high relaxed → more resilient
 * - energyLevel          → excitement + alert frequency → higher energy
 * - sociability          → attention + excitement → social seeking
 * - independence         → low hunger + low distress → self-sufficient
 *
 * All scores are lerped into [1, 5] from their ratio in [0, 1].
 */
function computeDimensions(
  dist: RawDistribution,
  events: EventRow[],
): Omit<AnimalPersonality, "animalId" | "eventsUsed" | "updatedAt"> {
  const n = dist.total;
  if (n === 0) {
    return {
      vocalExpressiveness: 3,
      stressResilience: 3,
      energyLevel: 3,
      sociability: 3,
      independence: 3,
      confidence: 0,
      source: "inferred",
    };
  }

  const r = (count: number) => count / n;

  // Vocal expressiveness: distress + excitement signals → vocal animal
  const vocalRatio = r(dist.distress + dist.excitement);
  const vocalScore = lerp(1, 5, clamp(vocalRatio * 2.5));

  // Stress resilience: high relaxed + low distress → resilient
  const resilRatio = r(dist.relaxed) - r(dist.distress) * 2;
  const resilScore = lerp(1, 5, clamp((resilRatio + 1) / 2));

  // Energy: excitement + alert → active
  const energyRatio = r(dist.excitement + dist.alert);
  const energyScore = lerp(1, 5, clamp(energyRatio * 2.5));

  // Sociability: attention + excitement → seeks interaction
  const socialRatio = r(dist.attention + dist.excitement);
  const socialScore = lerp(1, 5, clamp(socialRatio * 2.5));

  // Independence: low hunger + low distress → doesn't need constant reassurance
  const dependencyRatio = r(dist.hunger + dist.distress);
  const independenceScore = lerp(1, 5, clamp(1 - dependencyRatio * 2));

  // Confidence: grows with √(n / MIN_EVENTS), capped at 1
  const rawConf = Math.sqrt(n / MIN_EVENTS_FOR_CONFIDENCE);
  const confidence = Math.min(1, Math.round(rawConf * 1000) / 1000);

  // Average confidence of events (weighted signal quality)
  const avgEventConf =
    events.reduce((sum, e) => sum + e.confidence, 0) / events.length;
  const blendedConf = Math.min(1, confidence * (0.7 + 0.3 * avgEventConf));

  return {
    vocalExpressiveness: roundScore(vocalScore),
    stressResilience: roundScore(resilScore),
    energyLevel: roundScore(energyScore),
    sociability: roundScore(socialScore),
    independence: roundScore(independenceScore),
    confidence: Math.round(blendedConf * 1000) / 1000,
    source: "inferred",
  };
}

async function upsertPersonality(
  supabase: SupabaseClient<any>,
  animalId: number,
  profile: Omit<AnimalPersonality, "animalId" | "eventsUsed" | "updatedAt">,
  eventsUsed: number,
): Promise<void> {
  const { error } = await supabase.from("animal_personalities").upsert(
    {
      animal_id: animalId,
      vocal_expressiveness: profile.vocalExpressiveness,
      stress_resilience: profile.stressResilience,
      energy_level: profile.energyLevel,
      sociability: profile.sociability,
      independence: profile.independence,
      confidence: profile.confidence,
      source: "inferred",
      events_used: eventsUsed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "animal_id" },
  );

  if (error) {
    console.error("[Personality] Failed to upsert profile:", error.message);
  }
}

function mapRow(row: any, animalId: number): AnimalPersonality {
  return {
    animalId,
    vocalExpressiveness: Number(row.vocal_expressiveness),
    stressResilience: Number(row.stress_resilience),
    energyLevel: Number(row.energy_level),
    sociability: Number(row.sociability),
    independence: Number(row.independence),
    confidence: Number(row.confidence),
    source: row.source as "inferred" | "user" | "blended",
    eventsUsed: Number(row.events_used),
    updatedAt: row.updated_at,
  };
}

// ─── Math utilities ───────────────────────────────────────────────────────────

/** Linear interpolation between a and b by t ∈ [0,1] */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp x to [0, 1] */
function clamp(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Round to nearest integer in [1,5] */
function roundScore(v: number): number {
  return Math.max(1, Math.min(5, Math.round(v)));
}
