import { z } from 'zod';

export const confirmDraftSchema = z.object({
  periodId: z.string().uuid({ message: 'periodId harus berformat UUID valid' }),
  decision: z.enum(['APPROVED', 'REVISION_REQUESTED'], {
    errorMap: () => ({ message: 'decision harus bernilai APPROVED atau REVISION_REQUESTED' }),
  }),
  notes: z.string().max(1000, { message: 'Catatan konfirmasi maksimal 1000 karakter' }).optional().nullable(),
  signatoryName: z.string().min(2, { message: 'Nama pejabat penandatangan minimal 2 karakter' }).max(150),
  signatoryTitle: z.string().min(2, { message: 'Jabatan pejabat penandatangan minimal 2 karakter' }).max(150),
});

export type ConfirmDraftDto = z.infer<typeof confirmDraftSchema>;
