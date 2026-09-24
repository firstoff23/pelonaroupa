// server/lib/audioSignal.ts
// Algoritmia e Programação – Conceitos de Conversão Analógico/Digital e Processamento de Sinal
//
// Aplicação dos conceitos do curso (Slide 16 - Som: Conversão Analógico/Digital):
// 1. Teorema da Amostragem de Nyquist-Shannon: fs >= 2 * f_max
// 2. Cálculo de energia RMS (Root Mean Square) do sinal digital s(t)
// 3. Deteção de Saturação Digital (Clipping) e Rácio de Silêncio
// 4. Validação de integridade do buffer PCM antes do envio para inferência bioacústica

export interface AudioSignalValidationOptions {
  /** Taxa de amostragem mínima aceitável (Hz). Padrão: 16000 Hz (frequência de Nyquist para voz animal até 8kHz) */
  minSampleRate?: number;
  /** Limiar de amplitude abaixo do qual uma amostra é considerada silêncio (|s| < threshold). Padrão: 0.015 */
  silenceThreshold?: number;
  /** Limiar de saturação/clipping (|s| >= threshold). Padrão: 0.99 */
  clippingThreshold?: number;
  /** Duração mínima de áudio válida em segundos. Padrão: 0.5s */
  minDurationSeconds?: number;
  /** Duração máxima de áudio permitida em segundos. Padrão: 30s */
  maxDurationSeconds?: number;
}

export interface AudioSignalMetrics {
  sampleRate: number;
  durationSeconds: number;
  totalSamples: number;
  rmsEnergy: number;
  peakAmplitude: number;
  clippingCount: number;
  clippingRatio: number;
  silenceRatio: number;
  estimatedSnrDb: number;
  isValid: boolean;
  warnings: string[];
  rejectionReason?: string;
}

/**
 * Valida a taxa de amostragem segundo o Teorema de Nyquist-Shannon para bioacústica animal.
 * Vocalizações de cães e gatos contêm harmónicas significativas até 8 kHz,
 * exigindo uma frequência de amostragem mínima de 16 kHz (Nyquist: fs >= 2 * 8000 Hz).
 */
export function validateNyquistRate(sampleRate: number, minSampleRate = 16000): { isCompliant: boolean; message: string } {
  if (sampleRate < minSampleRate) {
    return {
      isCompliant: false,
      message: `Taxa de amostragem (${sampleRate} Hz) inferior ao mínimo de Nyquist (${minSampleRate} Hz) para bioacústica.`,
    };
  }
  return {
    isCompliant: true,
    message: `Taxa de amostragem (${sampleRate} Hz) conforme com o Teorema de Nyquist.`,
  };
}

/**
 * Converte um buffer PCM genérico (Int16Array ou Float32Array) para amostras normalizadas [-1.0, 1.0].
 */
export function normalizePcmBuffer(buffer: Float32Array | Int16Array): Float32Array {
  if (buffer instanceof Float32Array) {
    return buffer;
  }
  const float32 = new Float32Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    float32[i] = Math.max(-1, Math.min(1, buffer[i] / 32768));
  }
  return float32;
}

/**
 * Analisa e valida as características físicas e digitais de um sinal de áudio amostrado.
 * Implementa algoritmos puros para cálculo de energia RMS, rácio de silêncio e clipping.
 */
export function analyzeAudioSignal(
  buffer: Float32Array | Int16Array,
  sampleRate: number,
  options: AudioSignalValidationOptions = {},
): AudioSignalMetrics {
  const minSampleRate = options.minSampleRate ?? 16000;
  const silenceThreshold = options.silenceThreshold ?? 0.015;
  const clippingThreshold = options.clippingThreshold ?? 0.99;
  const minDurationSeconds = options.minDurationSeconds ?? 0.5;
  const maxDurationSeconds = options.maxDurationSeconds ?? 30;

  const totalSamples = buffer.length;
  const warnings: string[] = [];

  if (totalSamples === 0) {
    return {
      sampleRate,
      durationSeconds: 0,
      totalSamples: 0,
      rmsEnergy: 0,
      peakAmplitude: 0,
      clippingCount: 0,
      clippingRatio: 0,
      silenceRatio: 1,
      estimatedSnrDb: -Infinity,
      isValid: false,
      warnings: ["Buffer de áudio vazio."],
      rejectionReason: "O buffer de áudio não contém amostras (tamanho zero).",
    };
  }

  const durationSeconds = totalSamples / sampleRate;
  const samples = normalizePcmBuffer(buffer);

  let sumSquares = 0;
  let peakAmplitude = 0;
  let clippingCount = 0;
  let silentSamplesCount = 0;

  // Percorre as amostras discretas s[n] do sinal
  for (let i = 0; i < totalSamples; i++) {
    const val = samples[i];
    const absVal = Math.abs(val);

    sumSquares += val * val;

    if (absVal > peakAmplitude) {
      peakAmplitude = absVal;
    }

    if (absVal >= clippingThreshold) {
      clippingCount++;
    }

    if (absVal < silenceThreshold) {
      silentSamplesCount++;
    }
  }

  const rmsEnergy = Math.sqrt(sumSquares / totalSamples);
  const clippingRatio = clippingCount / totalSamples;
  const silenceRatio = silentSamplesCount / totalSamples;

  // Estimativa aproximada de SNR (Signal-to-Noise Ratio em dB)
  // Baseada na razão entre a energia de pico/RMS e o limiar de silêncio residual
  const noiseFloor = Math.max(silenceThreshold, 0.001);
  const estimatedSnrDb = rmsEnergy > 0 ? 20 * Math.log10(rmsEnergy / noiseFloor) : -Infinity;

  // Verificação de conformidade do sinal
  let isValid = true;
  let rejectionReason: string | undefined;

  const nyquistCheck = validateNyquistRate(sampleRate, minSampleRate);
  if (!nyquistCheck.isCompliant) {
    isValid = false;
    rejectionReason = nyquistCheck.message;
  } else if (durationSeconds < minDurationSeconds) {
    isValid = false;
    rejectionReason = `Duração do áudio (${durationSeconds.toFixed(2)}s) inferior ao mínimo de ${minDurationSeconds}s.`;
  } else if (durationSeconds > maxDurationSeconds) {
    isValid = false;
    rejectionReason = `Duração do áudio (${durationSeconds.toFixed(2)}s) superior ao máximo permitido de ${maxDurationSeconds}s.`;
  } else if (silenceRatio > 0.95 && rmsEnergy < 0.01) {
    isValid = false;
    rejectionReason = "O áudio é constituído quase exclusivamente por silêncio (sem vocalização detetada).";
  }

  if (clippingRatio > 0.05) {
    warnings.push(`Saturação digital (clipping) elevada: ${(clippingRatio * 100).toFixed(1)}% das amostras.`);
  }

  if (estimatedSnrDb < 6 && isValid) {
    warnings.push(`Relação sinal-ruído (SNR) baixa: ${estimatedSnrDb.toFixed(1)} dB.`);
  }

  return {
    sampleRate,
    durationSeconds: Number(durationSeconds.toFixed(3)),
    totalSamples,
    rmsEnergy: Number(rmsEnergy.toFixed(4)),
    peakAmplitude: Number(peakAmplitude.toFixed(4)),
    clippingCount,
    clippingRatio: Number(clippingRatio.toFixed(4)),
    silenceRatio: Number(silenceRatio.toFixed(4)),
    estimatedSnrDb: Number.isFinite(estimatedSnrDb) ? Number(estimatedSnrDb.toFixed(1)) : -99,
    isValid,
    warnings,
    rejectionReason,
  };
}
