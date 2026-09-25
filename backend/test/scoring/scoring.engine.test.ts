import { RmiScoringEngine } from '../../src/modules/scoring/scoring.engine';
import { getMaturityPhase, getPerformancePenalty } from '../../src/modules/scoring/scoring.constants';

describe('RMI Scoring Engine - Pure Logic & Regulation Compliance', () => {
  describe('1. Aturan Kriteria Terlemah (Weakest-Link Rule)', () => {
    it('wajib menghasilkan nilai kriteria terendah (1) meskipun kriteria lain bernilai 5', () => {
      const scores = [5, 5, 5, 5, 1];
      const result = RmiScoringEngine.calculateParameterScore(scores);
      expect(result).toBe(1);
    });

    it('wajib menghasilkan integer bulat terendah dari sekumpulan kriteria', () => {
      expect(RmiScoringEngine.calculateParameterScore([4, 4, 3, 5])).toBe(3);
      expect(RmiScoringEngine.calculateParameterScore([2, 3, 4, 5])).toBe(2);
      expect(RmiScoringEngine.calculateParameterScore([5, 5, 5])).toBe(5);
    });

    it('wajib melempar error jika array kriteria kosong', () => {
      expect(() => RmiScoringEngine.calculateParameterScore([])).toThrow(
        'Skor kriteria tidak boleh kosong'
      );
    });

    it('wajib melempar error jika skor kriteria di luar batas 1 s.d. 5', () => {
      expect(() => RmiScoringEngine.calculateParameterScore([3, 6, 2])).toThrow(
        'Nilai kriteria tidak valid'
      );
      expect(() => RmiScoringEngine.calculateParameterScore([3, 0, 2])).toThrow(
        'Nilai kriteria tidak valid'
      );
    });

    it('wajib melempar error jika skor kriteria berupa desimal/pecahan', () => {
      expect(() => RmiScoringEngine.calculateParameterScore([3.5, 4, 5])).toThrow(
        'Nilai kriteria tidak valid'
      );
    });
  });

  describe('2. Rata-rata Skor Dimensi & Aspek Dimensi', () => {
    it('wajib menghitung rata-rata parameter dimensi dengan pembulatan 2 desimal', () => {
      const paramScores = [3, 4, 3]; // 10 / 3 = 3.3333...
      const result = RmiScoringEngine.calculateDimensionScore(paramScores);
      expect(result).toBe(3.33);
    });

    it('wajib menghitung rata-rata seluruh parameter untuk Skor Aspek Dimensi', () => {
      const allParams = [3, 3, 4, 4, 2, 5]; // 21 / 6 = 3.50
      const result = RmiScoringEngine.calculateAspectDimensionScore(allParams);
      expect(result).toBe(3.5);
    });
  });

  describe('3. Klausul Ambang Batas Aspek Kinerja (Gating Clause)', () => {
    it('Aspek Kinerja TIDAK DIHITUNG (penyesuaian = 0.00) jika Skor Aspek Dimensi < 3.00 (misal: 2.99)', () => {
      const aspectDimScore = 2.99;
      // Meskipun kinerja terburuk (Rating D, Komposit 5)
      const performanceResult = RmiScoringEngine.calculatePerformanceAdjustment(
        aspectDimScore,
        { finalRating: 'D', compositeRiskRating: 5 }
      );

      expect(performanceResult.isEligible).toBe(false);
      expect(performanceResult.scoreAdjustment).toBe(0.0);
      expect(performanceResult.notes).toContain('< 3.00');
    });

    it('Aspek Kinerja DIHITUNG jika Skor Aspek Dimensi >= 3.00 (misal: 3.00 pas)', () => {
      const aspectDimScore = 3.0;
      // Kinerja terburuk: Rating D (0) + Komposit 5 (20) -> Combined = 10 (<= 50) -> Penalti -1.00
      const performanceResult = RmiScoringEngine.calculatePerformanceAdjustment(
        aspectDimScore,
        { finalRating: 'D', compositeRiskRating: 5 }
      );

      expect(performanceResult.isEligible).toBe(true);
      expect(performanceResult.combinedPerformanceScore).toBe(10);
      expect(performanceResult.scoreAdjustment).toBe(-1.0);
    });

    it('Penalti 0.00 jika kinerja sangat prima (Rating AAA, Komposit 1 -> Score 100)', () => {
      const aspectDimScore = 3.5;
      const performanceResult = RmiScoringEngine.calculatePerformanceAdjustment(
        aspectDimScore,
        { finalRating: 'AAA', compositeRiskRating: 1 }
      );

      expect(performanceResult.isEligible).toBe(true);
      expect(performanceResult.combinedPerformanceScore).toBe(100);
      expect(performanceResult.scoreAdjustment).toBe(0.0);
    });

    it('Penalti -0.50 untuk kombinasi rating moderat (Rating BBB=75, Komposit 3=60 -> Score 68)', () => {
      const aspectDimScore = 3.4;
      // (75 * 0.5) + (60 * 0.5) = 37.5 + 30 = 67.5 -> round = 68 (antara 65 < S <= 80 -> -0.50)
      const performanceResult = RmiScoringEngine.calculatePerformanceAdjustment(
        aspectDimScore,
        { finalRating: 'BBB', compositeRiskRating: 3 }
      );

      expect(performanceResult.isEligible).toBe(true);
      expect(performanceResult.combinedPerformanceScore).toBe(68);
      expect(performanceResult.scoreAdjustment).toBe(-0.5);
    });
  });

  describe('4. Tabel Penalti Kinerja dan Spektrum Kematangan RMI', () => {
    it('memverifikasi seluruh rentang penalti kinerja', () => {
      expect(getPerformancePenalty(45)).toBe(-1.0);   // <= 50
      expect(getPerformancePenalty(50)).toBe(-1.0);   // <= 50
      expect(getPerformancePenalty(55)).toBe(-0.75);  // 50 < S <= 65
      expect(getPerformancePenalty(65)).toBe(-0.75);  // 50 < S <= 65
      expect(getPerformancePenalty(70)).toBe(-0.5);   // 65 < S <= 80
      expect(getPerformancePenalty(80)).toBe(-0.5);   // 65 < S <= 80
      expect(getPerformancePenalty(85)).toBe(-0.25);  // 80 < S <= 90
      expect(getPerformancePenalty(90)).toBe(-0.25);  // 80 < S <= 90
      expect(getPerformancePenalty(95)).toBe(0.0);    // > 90
    });

    it('memverifikasi penentuan fase kematangan risiko', () => {
      expect(getMaturityPhase(1.2)).toBe('Awal');
      expect(getMaturityPhase(1.85)).toBe('Awal (+)');
      expect(getMaturityPhase(2.1)).toBe('Berkembang');
      expect(getMaturityPhase(2.75)).toBe('Berkembang (+)');
      expect(getMaturityPhase(3.25)).toBe('Baik');
      expect(getMaturityPhase(3.8)).toBe('Baik (+)');
      expect(getMaturityPhase(4.25)).toBe('Lebih Baik');
      expect(getMaturityPhase(4.65)).toBe('Lebih Baik (+)');
      expect(getMaturityPhase(5.0)).toBe('Terbaik');
    });
  });

  describe('5. Kalkulasi Asesmen Akhir Lengkap (Integration Test Engine)', () => {
    it('menghasilkan nilai akhir RMI dan fase kematangan yang akurat', () => {
      const dimensionMap: Record<number, number[]> = {
        1: [3, 4, 3], // D1 avg: 3.33
        2: [3, 3, 4, 4], // D2 avg: 3.50
        3: [4, 4, 3], // D3 avg: 3.67
        4: [3, 3, 3], // D4 avg: 3.00
        5: [4, 4], // D5 avg: 4.00
      };
      // Total 15 params: sum = (10 + 14 + 11 + 9 + 8) = 52. 52 / 15 = 3.4666 -> 3.47

      const performanceInput = {
        finalRating: 'A', // 85
        compositeRiskRating: 2, // 80 -> Combined: (85*0.5)+(80*0.5) = 82.5 -> 83 -> Penalti -0.25
      };

      const result = RmiScoringEngine.calculateFinalAssessment(
        dimensionMap,
        performanceInput
      );

      expect(result.aspectDimensionScore).toBe(3.47);
      expect(result.performanceResult.isEligible).toBe(true);
      expect(result.performanceResult.scoreAdjustment).toBe(-0.25);
      // 3.47 - 0.25 = 3.22
      expect(result.finalRmiScore).toBe(3.22);
      expect(result.maturityPhase).toBe('Baik');
    });
  });
});
