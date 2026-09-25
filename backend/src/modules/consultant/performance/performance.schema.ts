import { z } from 'zod';

export const savePerformanceSchema = z.object({
  periodId: z.string().uuid({ message: 'periodId harus berformat UUID valid' }),
  finalRating: z.enum(['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'D'], {
    errorMap: () => ({ message: 'finalRating harus berupa rating tingkat kesehatan BUMN valid (AAA, AA, A, BBB, BB, B, CCC, D)' }),
  }),
  kpmrScore: z.number().min(0, { message: 'Skor KPMR minimal 0' }).max(100, { message: 'Skor KPMR maksimal 100' }),
  compositeRating: z.number().int().min(1, { message: 'Peringkat Komposit minimal 1' }).max(5, { message: 'Peringkat Komposit maksimal 5' }),
  spiReviewNotes: z.string().max(2000, { message: 'Catatan reviu SPI maksimal 2000 karakter' }).optional().nullable(),
});

export type SavePerformanceDto = z.infer<typeof savePerformanceSchema>;
