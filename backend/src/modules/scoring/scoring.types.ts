export type MaturityPhase =
  | 'Awal'
  | 'Awal (+)'
  | 'Berkembang'
  | 'Berkembang (+)'
  | 'Baik'
  | 'Baik (+)'
  | 'Lebih Baik'
  | 'Lebih Baik (+)'
  | 'Terbaik';

export type FinalRatingLevel =
  | 'AAA'
  | 'AA'
  | 'A'
  | 'BBB'
  | 'BB'
  | 'B'
  | 'CCC'
  | 'CC'
  | 'C'
  | 'D';

export interface PerformanceInput {
  finalRating: FinalRatingLevel | string; // AAA s.d. D
  compositeRiskRating: number;           // 1 s.d. 5
}

export interface PerformanceCalculationResult {
  finalRatingScore: number;
  compositeRiskScore: number;
  combinedPerformanceScore: number;
  isEligible: boolean; // True jika Aspek Dimensi >= 3.00
  scoreAdjustment: number; // 0.00 s.d. -1.00
  notes: string;
}

export interface DimensionScoreResult {
  dimensionId: number;
  dimensionCode: string;
  dimensionName: string;
  parameterCount: number;
  averageScore: number; // Dibulatkan ke 2 desimal
}

export interface ParameterScoreResult {
  parameterNumber: number;
  parameterCode: string;
  criterionScores: number[];
  finalScore: number; // Integer 1 s.d. 5 (Weakest-Link)
}

export interface FinalRmiAssessmentResult {
  aspectDimensionScore: number;
  performanceResult: PerformanceCalculationResult;
  finalRmiScore: number;
  maturityPhase: MaturityPhase;
  dimensionResults: DimensionScoreResult[];
  parameterResults: ParameterScoreResult[];
}
