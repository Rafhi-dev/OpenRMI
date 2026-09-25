import { z } from 'zod';

export const createAssignmentSchema = z.object({
  tenantId: z.string().uuid('ID Tenant tidak valid'),
  consultantId: z.string().uuid('ID Konsultan tidak valid'),
  periodId: z.string().uuid('ID Periode Penilaian tidak valid'),
  startDate: z.string().datetime('Format tanggal mulai tidak valid (ISO 8601)'),
  endDate: z.string().datetime('Format tanggal selesai tidak valid (ISO 8601)'),
  ndaDocumentUrl: z.string().url('URL Dokumen NDA tidak valid').optional().nullable(),
});

export const updateAssignmentSchema = z.object({
  endDate: z.string().datetime().optional(),
  ndaDocumentUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
