import { z } from 'zod';

export const presignedUrlSchema = z.object({
  fileName: z.string().min(1, 'Nama file wajib diisi').trim(),
  mimeType: z.string().min(1, 'Tipe MIME file wajib diisi').trim(),
  fileSizeBytes: z.number().int().min(1).optional(),
});

export const createEvidenceSchema = z.object({
  criterionId: z.number({ invalid_type_error: 'ID Kriteria harus berupa angka' }).int(),
  fileName: z.string().min(1, 'Nama berkas bukti wajib diisi').trim(),
  fileUrl: z.string().url('URL berkas bukti tidak valid'),
  fileSize: z.number().int().min(1, 'Ukuran berkas tidak valid'),
  mimeType: z.string().min(1, 'Tipe MIME wajib diisi'),
  docNumber: z.string().trim().optional().nullable(),
  effectiveDate: z.string().datetime().optional().nullable(),
  sectionNotes: z.string().trim().optional().nullable(),
});

export type PresignedUrlInput = z.infer<typeof presignedUrlSchema>;
export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;
