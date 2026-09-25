import { z } from 'zod';
import { SupplementaryCategory } from '@prisma/client';

export const createSupplementaryDocSchema = z.object({
  periodId: z.string().uuid('ID Periode Penilaian tidak valid'),
  fileName: z.string().min(1, 'Nama file wajib diisi').trim(),
  fileUrl: z.string().url('URL berkas tidak valid'),
  fileSize: z.number().int().min(1, 'Ukuran berkas tidak valid'),
  mimeType: z.string().min(1, 'Tipe MIME wajib diisi'),
  category: z.nativeEnum(SupplementaryCategory).default(SupplementaryCategory.FGD_FOLLOW_UP),
  description: z.string().trim().optional().nullable(),
  submissionNotes: z.string().trim().optional().nullable(),
});

export type CreateSupplementaryDocInput = z.infer<typeof createSupplementaryDocSchema>;
