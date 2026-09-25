import { z } from 'zod';

export const createVendorSchema = z.object({
  name: z.string().min(3, 'Nama vendor minimal 3 karakter').trim(),
  code: z
    .string()
    .min(3, 'Kode vendor minimal 3 karakter')
    .max(20, 'Kode vendor maksimal 20 karakter')
    .toUpperCase()
    .trim(),
  email: z.string().email('Format email tidak valid').trim(),
  phone: z.string().optional(),
  address: z.string().optional(),
  maxTenants: z.number().int().min(1, 'Kuota minimal 1 tenant').default(10),
  licenseStatus: z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED']).default('ACTIVE'),
  licenseExpiry: z.string().datetime().optional(),
});

export const updateVendorSchema = z.object({
  name: z.string().min(3, 'Nama vendor minimal 3 karakter').trim().optional(),
  email: z.string().email('Format email tidak valid').trim().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  maxTenants: z.number().int().min(1).optional(),
  licenseStatus: z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED']).optional(),
  licenseExpiry: z.string().datetime().nullable().optional(),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
