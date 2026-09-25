import { z } from 'zod';
import { RecommendationStatus } from '@prisma/client';

export const createRecommendationSchema = z.object({
  periodId: z.string().uuid({ message: 'periodId harus berformat UUID valid' }),
  parameterCode: z.string().regex(/^P\d{2}$/, { message: 'parameterCode harus berformat P01 s.d. P42' }),
  recommendation: z.string().min(5, { message: 'Rekomendasi minimal 5 karakter' }).max(2000),
  targetDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'targetDate harus berupa string tanggal valid',
  }),
  mainActivities: z.string().min(5, { message: 'Aktivitas utama minimal 5 karakter' }).max(2000),
  expectedOutput: z.string().min(5, { message: 'Output yang diharapkan minimal 5 karakter' }).max(2000),
  successIndicator: z.string().min(5, { message: 'Indikator keberhasilan minimal 5 karakter' }).max(2000),
  unitInCharge: z.string().min(2, { message: 'Unit penanggung jawab (UIC) minimal 2 karakter' }).max(200),
  priorityQuadrant: z.number().int().min(1).max(3, {
    message: 'priorityQuadrant harus bernilai 1 (Tinggi/Mudah), 2 (Tinggi/Sulit atau Rendah/Mudah), atau 3 (Rendah/Sulit)',
  }),
  horizon: z.enum(['SHORT_TERM', 'LONG_TERM'], {
    errorMap: () => ({ message: 'horizon harus bernilai SHORT_TERM atau LONG_TERM' }),
  }),
  status: z.nativeEnum(RecommendationStatus).default(RecommendationStatus.BD),
});

export const updateRecommendationSchema = createRecommendationSchema.partial().omit({ periodId: true });

export type CreateRecommendationDto = z.infer<typeof createRecommendationSchema>;
export type UpdateRecommendationDto = z.infer<typeof updateRecommendationSchema>;
