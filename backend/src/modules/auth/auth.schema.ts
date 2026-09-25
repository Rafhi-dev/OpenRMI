import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, 'Username atau Email minimal 3 karakter')
    .trim(),
  password: z
    .string()
    .min(6, 'Password minimal 6 karakter'),
});

export const impersonateSchema = z.object({
  targetVendorId: z
    .string()
    .uuid('ID Vendor tidak valid'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ImpersonateInput = z.infer<typeof impersonateSchema>;
