import { z } from 'zod';

export const aiAssistParameterSchema = z.object({
  periodId: z.string().uuid({ message: 'periodId harus berformat UUID valid' }),
  parameterCode: z.string().regex(/^P\d{2}$/, { message: 'parameterCode harus berformat P01 s.d. P42' }),
});

export const applyAiRecommendationSchema = z.object({
  periodId: z.string().uuid({ message: 'periodId harus berformat UUID valid' }),
  parameterCode: z.string().regex(/^P\d{2}$/, { message: 'parameterCode harus berformat P01 s.d. P42' }),
  recommendationId: z.string().uuid({ message: 'recommendationId harus berformat UUID valid' }),
  applyNotes: z.string().max(500).optional(),
});

export const analyzeSupplementaryDocSchema = z.object({
  customPrompt: z
    .string()
    .min(5, { message: 'Prompt analisis minimal 5 karakter' })
    .max(1000, { message: 'Prompt analisis maksimal 1000 karakter' }),
});

export const updateAnalysisResultSchema = z.object({
  assessorNotes: z.string().max(2000, { message: 'Catatan internal asesor maksimal 2000 karakter' }).optional().nullable(),
  isPrivateToAssessor: z.boolean().default(true),
});

export type AiAssistParameterDto = z.infer<typeof aiAssistParameterSchema>;
export type ApplyAiRecommendationDto = z.infer<typeof applyAiRecommendationSchema>;
export type AnalyzeSupplementaryDocDto = z.infer<typeof analyzeSupplementaryDocSchema>;
export type UpdateAnalysisResultDto = z.infer<typeof updateAnalysisResultSchema>;
