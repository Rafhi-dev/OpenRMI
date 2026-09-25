import { FinalRatingLevel, MaturityPhase } from './scoring.types';

/**
 * Tabel konversi Final Rating Tingkat Kesehatan BUMN ke skala nilai 0 - 100
 */
export const FINAL_RATING_SCORE_MAP: Record<string, number> = {
  AAA: 100,
  AA: 95,
  A: 85,
  BBB: 75,
  BB: 65,
  B: 55,
  CCC: 40,
  CC: 30,
  C: 20,
  D: 0,
};

/**
 * Tabel konversi Peringkat Komposit Risiko (1 - 5) ke skala nilai 0 - 100
 */
export const COMPOSITE_RISK_SCORE_MAP: Record<number, number> = {
  1: 100, // Low
  2: 80,  // Low to Moderate
  3: 60,  // Moderate
  4: 40,  // Moderate to High
  5: 20,  // High
};

/**
 * Bobot Aspek Kinerja: 50% Final Rating + 50% Peringkat Komposit Risiko
 */
export const PERFORMANCE_WEIGHT = {
  FINAL_RATING: 0.5,
  COMPOSITE_RISK: 0.5,
};

/**
 * Klausul Gating Aspek Kinerja: Nilai minimum Aspek Dimensi agar penalti kinerja dihitung
 */
export const GATING_THRESHOLD = 3.0;

/**
 * Menghitung faktor penyesuaian skor (penalti) dari nilai gabungan kinerja
 * @param combinedScore Nilai kombinasi kinerja (0 - 100)
 */
export function getPerformancePenalty(combinedScore: number): number {
  if (combinedScore <= 50) return -1.0;
  if (combinedScore <= 65) return -0.75;
  if (combinedScore <= 80) return -0.5;
  if (combinedScore <= 90) return -0.25;
  return 0.0;
}

/**
 * Menentukan fase kematangan risiko berdasarkan Skor Akhir RMI (1.00 s.d. 5.00)
 * @param finalScore Skor RMI akhir (setelah penyesuaian kinerja)
 */
export function getMaturityPhase(finalScore: number): MaturityPhase {
  const rounded = Math.round(finalScore * 100) / 100;

  if (rounded >= 5.0) return 'Terbaik';
  if (rounded >= 4.5) return 'Lebih Baik (+)';
  if (rounded >= 4.0) return 'Lebih Baik';
  if (rounded >= 3.5) return 'Baik (+)';
  if (rounded >= 3.0) return 'Baik';
  if (rounded >= 2.5) return 'Berkembang (+)';
  if (rounded >= 2.0) return 'Berkembang';
  if (rounded >= 1.5) return 'Awal (+)';
  return 'Awal';
}
