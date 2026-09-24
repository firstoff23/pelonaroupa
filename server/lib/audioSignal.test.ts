// server/lib/audioSignal.test.ts
import { describe, expect, it } from "vitest";
import {
  analyzeAudioSignal,
  normalizePcmBuffer,
  validateNyquistRate,
} from "./audioSignal";

describe("audioSignal - Algoritmia e Análise de Sinal (A/D)", () => {
  it("valida conformidade com a taxa de Nyquist", () => {
    expect(validateNyquistRate(8000).isCompliant).toBe(false);
    expect(validateNyquistRate(16000).isCompliant).toBe(true);
    expect(validateNyquistRate(44100).isCompliant).toBe(true);
    expect(validateNyquistRate(48000).isCompliant).toBe(true);
  });

  it("rejeita buffer vazio com mensagem descritiva", () => {
    const emptyBuffer = new Float32Array(0);
    const metrics = analyzeAudioSignal(emptyBuffer, 16000);
    expect(metrics.isValid).toBe(false);
    expect(metrics.totalSamples).toBe(0);
    expect(metrics.rejectionReason).toContain("tamanho zero");
  });

  it("rejeita áudio com duração inferior ao mínimo", () => {
    // 0.2s a 16kHz = 3200 amostras (mínimo padrão é 0.5s)
    const shortBuffer = new Float32Array(3200);
    const metrics = analyzeAudioSignal(shortBuffer, 16000);
    expect(metrics.isValid).toBe(false);
    expect(metrics.rejectionReason).toContain("inferior ao mínimo");
  });

  it("rejeita áudio que consiste exclusivamente em silêncio", () => {
    // 1 segundo de silêncio absoluto (zeros) a 16kHz
    const silentBuffer = new Float32Array(16000);
    const metrics = analyzeAudioSignal(silentBuffer, 16000);
    expect(metrics.isValid).toBe(false);
    expect(metrics.silenceRatio).toBe(1.0);
    expect(metrics.rejectionReason).toContain("silêncio");
  });

  it("analisa com sucesso um sinal senoidal válido (vocalização simulada)", () => {
    const sampleRate = 16000;
    const duration = 1.0; // 1s
    const totalSamples = sampleRate * duration;
    const buffer = new Float32Array(totalSamples);
    const freq = 440; // Tom de 440 Hz

    for (let i = 0; i < totalSamples; i++) {
      buffer[i] = 0.5 * Math.sin((2 * Math.PI * freq * i) / sampleRate);
    }

    const metrics = analyzeAudioSignal(buffer, sampleRate);
    expect(metrics.isValid).toBe(true);
    expect(metrics.totalSamples).toBe(16000);
    expect(metrics.durationSeconds).toBe(1.0);
    expect(metrics.peakAmplitude).toBeCloseTo(0.5, 1);
    expect(metrics.rmsEnergy).toBeGreaterThan(0.3);
    expect(metrics.clippingCount).toBe(0);
    expect(metrics.warnings.length).toBe(0);
  });

  it("deteta saturação digital (clipping) quando as amostras atingem o limite", () => {
    const sampleRate = 16000;
    const buffer = new Float32Array(16000);
    // 20% das amostras com saturação máxima (1.0)
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = i < 3200 ? 1.0 : 0.2;
    }

    const metrics = analyzeAudioSignal(buffer, sampleRate);
    expect(metrics.clippingCount).toBe(3200);
    expect(metrics.clippingRatio).toBeCloseTo(0.2, 2);
    expect(metrics.warnings.some((w) => w.includes("clipping"))).toBe(true);
  });

  it("converte e normaliza corretamente buffers Int16Array para Float32Array", () => {
    const int16 = new Int16Array([0, 16384, 32767, -32768]);
    const normalized = normalizePcmBuffer(int16);

    expect(normalized[0]).toBe(0);
    expect(normalized[1]).toBeCloseTo(0.5, 2);
    expect(normalized[2]).toBeCloseTo(1.0, 2);
    expect(normalized[3]).toBe(-1.0);
  });
});
