import { z } from 'zod';
import { IndustryCluster } from '@prisma/client';

export const createTenantSchema = z.object({
  name: z.string().min(3, 'Nama perusahaan klien minimal 3 karakter').trim(),
  code: z
    .string()
    .min(2, 'Kode tenant minimal 2 karakter')
    .max(15, 'Kode tenant maksimal 15 karakter')
    .toUpperCase()
    .trim(),
  industryCluster: z.nativeEnum(IndustryCluster).default(IndustryCluster.UMUM),
  logoUrl: z.string().url('URL Logo tidak valid').optional().nullable(),
  initialYear: z.number().int().min(2020).max(2035).optional(), // Tahun observasi awal
});

export const updateTenantSchema = z.object({
  name: z.string().min(3, 'Nama perusahaan klien minimal 3 karakter').trim().optional(),
  industryCluster: z.nativeEnum(IndustryCluster).optional(),
  logoUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
