import { z } from 'zod';

export const saveEvaluationSchema = z.object({
  periodId: z.string().uuid({ message: 'periodId harus berformat UUID valid' }),
  criterionId: z.number().int().positive({ message: 'criterionId harus berupa integer positif' }),
  score: z.number().int().min(1, { message: 'Skor minimal 1' }).max(5, { message: 'Skor maksimal 5' }),
  reviewNotes: z.string().max(2000, { message: 'Catatan reviu dokumen (Kolom J) maksimal 2000 karakter' }).optional().nullable(),
  findingsGap: z.string().max(2000, { message: 'Celah temuan / gap maksimal 2000 karakter' }).optional().nullable(),
  interviewNotes: z.string().max(2000, { message: 'Catatan wawancara (Kolom K) maksimal 2000 karakter' }).optional().nullable(),
  screenshotUrl: z.string().url({ message: 'URL screenshot harus berupa URL valid' }).optional().nullable(),
  assessorNotes: z.string().max(2000, { message: 'Catatan internal konsultan maksimal 2000 karakter' }).optional().nullable(),
});

export const batchSaveEvaluationSchema = z.object({
  periodId: z.string().uuid({ message: 'periodId harus berformat UUID valid' }),
  evaluations: z.array(
    z.object({
      criterionId: z.number().int().positive(),
      score: z.number().int().min(1).max(5),
      reviewNotes: z.string().max(2000).optional().nullable(),
      findingsGap: z.string().max(2000).optional().nullable(),
      interviewNotes: z.string().max(2000).optional().nullable(),
      screenshotUrl: z.string().url().optional().nullable(),
      assessorNotes: z.string().max(2000).optional().nullable(),
    })
  ).min(1, { message: 'Minimal 1 evaluasi kriteria untuk disimpan' }),
});

export type SaveEvaluationDto = z.infer<typeof saveEvaluationSchema>;
export type BatchSaveEvaluationDto = z.infer<typeof batchSaveEvaluationSchema>;
