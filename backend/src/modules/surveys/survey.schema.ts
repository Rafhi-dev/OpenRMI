import { z } from 'zod';

export const initiateSurveySchema = z.object({
  periodId: z.string().uuid({ message: 'periodId harus berformat UUID valid' }),
  startDate: z.string().datetime({ offset: true }).optional().nullable(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const toggleSurveySchema = z.object({
  periodId: z.string().uuid({ message: 'periodId harus berformat UUID valid' }),
  isActive: z.boolean(),
});

export const submitPublicSurveySchema = z.object({
  division: z.string().max(100).optional().nullable(),
  jobLevel: z.string().max(100).optional().nullable(),
  tenureYears: z.number().int().min(0).max(50).optional().nullable(),
  answers: z.array(
    z.number().int().min(1, 'Nilai Likert minimal 1').max(5, 'Nilai Likert maksimal 5')
  ).min(1, 'Setidaknya 1 pertanyaan harus dijawab'),
});

export type InitiateSurveyDto = z.infer<typeof initiateSurveySchema>;
export type ToggleSurveyDto = z.infer<typeof toggleSurveySchema>;
export type SubmitPublicSurveyDto = z.infer<typeof submitPublicSurveySchema>;
