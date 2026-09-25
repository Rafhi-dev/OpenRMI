import {
  COMPOSITE_RISK_SCORE_MAP,
  FINAL_RATING_SCORE_MAP,
  GATING_THRESHOLD,
  getMaturityPhase,
  getPerformancePenalty,
  PERFORMANCE_WEIGHT,
} from './scoring.constants';
import {
  DimensionScoreResult,
  FinalRmiAssessmentResult,
  ParameterScoreResult,
  PerformanceCalculationResult,
  PerformanceInput,
} from './scoring.types';

export class RmiScoringEngine {
  /**
   * 1. Menghitung Skor Parameter menggunakan Aturan Kriteria Terlemah (Weakest-Link Rule)
   * Formula: Skor Parameter = min(Kriteria_1, Kriteria_2, ..., Kriteria_m)
   * Output HARUS berupa integer bulat (1, 2, 3, 4, atau 5).
   *
   * @param criterionScores Array skor kriteria (1 s.d. 5)
   */
  public static calculateParameterScore(criterionScores: number[]): number {
    if (!criterionScores || criterionScores.length === 0) {
      throw new Error('Skor kriteria tidak boleh kosong untuk menghitung skor parameter.');
    }

    for (const score of criterionScores) {
      if (score < 1 || score > 5 || !Number.isInteger(score)) {
        throw new Error(
          `Nilai kriteria tidak valid: ${score}. Nilai kriteria harus berupa bilangan bulat 1 s.d. 5.`
        );
      }
    }

    const minScore = Math.min(...criterionScores);
    return minScore;
  }

  /**
   * 2. Menghitung Skor Rata-rata Dimensi dari parameter-parameter di dalamnya
   * Dibulatkan ke 2 angka desimal.
   *
   * @param parameterScores Array skor parameter dalam dimensi tersebut
   */
  public static calculateDimensionScore(parameterScores: number[]): number {
    if (!parameterScores || parameterScores.length === 0) {
      return 0.0;
    }

    const sum = parameterScores.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / parameterScores.length;
    return Math.round(avg * 100) / 100;
  }

  /**
   * 3. Menghitung Skor Aspek Dimensi (Rata-rata seluruh 42 atau 41 parameter)
   * Dibulatkan ke 2 angka desimal.
   *
   * @param allParameterScores Array seluruh skor parameter
   */
  public static calculateAspectDimensionScore(allParameterScores: number[]): number {
    if (!allParameterScores || allParameterScores.length === 0) {
      return 0.0;
    }

    const sum = allParameterScores.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / allParameterScores.length;
    return Math.round(avg * 100) / 100;
  }

  /**
   * 4. Menghitung Faktor Penyesuaian Aspek Kinerja (Performance Gating & Penalty)
   * Klausul Gating:
   * - Jika Skor Aspek Dimensi < 3.00, Aspek Kinerja TIDAK DIHITUNG (Penyesuaian = 0.00).
   * - Jika Skor Aspek Dimensi >= 3.00, dihitung kombinasi 50% Final Rating + 50% Peringkat Komposit.
   */
  public static calculatePerformanceAdjustment(
    aspectDimensionScore: number,
    input?: PerformanceInput
  ): PerformanceCalculationResult {
    // Skenario 1: Tidak ada data kinerja yang diberikan
    if (!input || !input.finalRating || !input.compositeRiskRating) {
      return {
        finalRatingScore: 0,
        compositeRiskScore: 0,
        combinedPerformanceScore: 0,
        isEligible: false,
        scoreAdjustment: 0.0,
        notes: 'Data Aspek Kinerja belum diisi.',
      };
    }

    // Skenario 2: Aspek Dimensi di bawah klausul ambang batas (< 3.00)
    if (aspectDimensionScore < GATING_THRESHOLD) {
      return {
        finalRatingScore: 0,
        compositeRiskScore: 0,
        combinedPerformanceScore: 0,
        isEligible: false,
        scoreAdjustment: 0.0,
        notes: `Skor Aspek Dimensi (${aspectDimensionScore.toFixed(
          2
        )}) < 3.00. Sesuai regulasi KBUMN, penyesuaian Aspek Kinerja tidak diperhitungkan.`,
      };
    }

    // Skenario 3: Memenuhi syarat ambang batas (>= 3.00)
    const normalizedRating = input.finalRating.toUpperCase().trim();
    const finalRatingScore = FINAL_RATING_SCORE_MAP[normalizedRating] ?? 0;
    const compositeRiskScore = COMPOSITE_RISK_SCORE_MAP[input.compositeRiskRating] ?? 0;

    const combinedPerformanceScore = Math.round(
      finalRatingScore * PERFORMANCE_WEIGHT.FINAL_RATING +
        compositeRiskScore * PERFORMANCE_WEIGHT.COMPOSITE_RISK
    );

    const scoreAdjustment = getPerformancePenalty(combinedPerformanceScore);

    return {
      finalRatingScore,
      compositeRiskScore,
      combinedPerformanceScore,
      isEligible: true,
      scoreAdjustment,
      notes: `Aspek Dimensi memenuhi syarat (>= 3.00). Nilai gabungan kinerja: ${combinedPerformanceScore} menghasilkan faktor penyesuaian: ${scoreAdjustment.toFixed(
        2
      )}.`,
    };
  }

  /**
   * 5. Menghitung Komposit Akhir Nilai RMI dan Fase Kematangan
   * Formula: Skor Akhir RMI = Skor Aspek Dimensi + Penyesuaian Kinerja
   * Batas nilai akhir: minimal 1.00, maksimal 5.00
   */
  public static calculateFinalAssessment(
    dimensionMap: Record<number, number[]>, // Key: dimensionId (1..5), Value: parameter scores
    performanceInput?: PerformanceInput
  ): FinalRmiAssessmentResult {
    const dimensionResults: DimensionScoreResult[] = [];
    const allParameterScores: number[] = [];

    const dimensionNames: Record<number, { code: string; name: string }> = {
      1: { code: 'D1', name: 'Budaya & Kapabilitas Risiko' },
      2: { code: 'D2', name: 'Organisasi & Tata Kelola Risiko' },
      3: { code: 'D3', name: 'Kerangka Risiko & Kepatuhan' },
      4: { code: 'D4', name: 'Proses & Kontrol Risiko' },
      5: { code: 'D5', name: 'Model, Data & Teknologi Risiko' },
    };

    for (let dimId = 1; dimId <= 5; dimId++) {
      const scores = dimensionMap[dimId] || [];
      allParameterScores.push(...scores);
      const avg = this.calculateDimensionScore(scores);

      dimensionResults.push({
        dimensionId: dimId,
        dimensionCode: dimensionNames[dimId]?.code || `D${dimId}`,
        dimensionName: dimensionNames[dimId]?.name || `Dimensi ${dimId}`,
        parameterCount: scores.length,
        averageScore: avg,
      });
    }

    const aspectDimensionScore = this.calculateAspectDimensionScore(allParameterScores);
    const performanceResult = this.calculatePerformanceAdjustment(
      aspectDimensionScore,
      performanceInput
    );

    let rawFinalScore = aspectDimensionScore + performanceResult.scoreAdjustment;
    // Normalisasi batas rentang nilai RMI: 1.00 s.d. 5.00
    if (rawFinalScore < 1.0) rawFinalScore = 1.0;
    if (rawFinalScore > 5.0) rawFinalScore = 5.0;

    const finalRmiScore = Math.round(rawFinalScore * 100) / 100;
    const maturityPhase = getMaturityPhase(finalRmiScore);

    return {
      aspectDimensionScore,
      performanceResult,
      finalRmiScore,
      maturityPhase,
      dimensionResults,
      parameterResults: [],
    };
  }
}
