import { z } from 'zod';

export const saveHistoricalAssessmentSchema = z.object({
  periodId: z.string().uuid({ message: 'periodId harus berformat UUID valid' }),
  previousYear: z.number().int().min(2015).max(2050, { message: 'Tahun sebelumnya harus berada dalam rentang valid' }),
  dimensionScores: z.object({
    D1: z.number().min(1).max(5),
    D2: z.number().min(1).max(5),
    D3: z.number().min(1).max(5),
    D4: z.number().min(1).max(5),
    D5: z.number().min(1).max(5),
  }),
  aspectDimScore: z.number().min(1).max(5).optional(),
  perfScore: z.number().min(0).max(100).optional().nullable(),
  finalRmiScore: z.number().min(1).max(5).optional(),
  maturityPhase: z.string().max(50).optional().nullable(),
  parameterScores: z.record(z.string(), z.number().min(1).max(5)).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type SaveHistoricalAssessmentDto = z.infer<typeof saveHistoricalAssessmentSchema>;
