import { z } from 'zod';
import { RecommendationStatus } from '@prisma/client';

export const createFollowUpSchema = z.object({
  recommendationId: z.number().int().positive({ message: 'recommendationId harus berupa integer positif' }),
  quarter: z.enum(['TW_1', 'TW_2', 'TW_3', 'TW_4'], {
    errorMap: () => ({ message: 'quarter harus bernilai TW_1, TW_2, TW_3, atau TW_4' }),
  }),
  year: z.number().int().min(2020).max(2050),
  progressNotes: z.string().min(5, { message: 'Catatan progres minimal 5 karakter' }).max(2000),
  evidenceFileUrl: z.string().url({ message: 'URL berkas bukti harus berupa URL yang valid' }).optional().nullable(),
  statusReported: z.nativeEnum(RecommendationStatus, {
    errorMap: () => ({ message: 'statusReported harus berupa status valid: S, BS, BD, atau TDD' }),
  }),
});

export type CreateFollowUpDto = z.infer<typeof createFollowUpSchema>;
