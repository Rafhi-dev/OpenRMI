import { z } from 'zod';

export const createConsultantSchema = z.object({
  fullName: z.string().min(3, 'Nama konsultan minimal 3 karakter').trim(),
  username: z
    .string()
    .min(3, 'Username minimal 3 karakter')
    .max(30, 'Username maksimal 30 karakter')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username hanya boleh huruf, angka, underscore, titik, dan strip')
    .trim(),
  email: z.string().email('Format email tidak valid').trim(),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  agencyName: z.string().optional(),
});

export const updateConsultantSchema = z.object({
  fullName: z.string().min(3).trim().optional(),
  email: z.string().email().trim().optional(),
  agencyName: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateConsultantInput = z.infer<typeof createConsultantSchema>;
export type UpdateConsultantInput = z.infer<typeof updateConsultantSchema>;
