import { z } from 'zod';

export const loginSchema = z
  .object({
    identifier: z.string().trim().optional(),
    identity: z.string().trim().optional(),
    password: z.string().min(6, 'Password minimal 6 karakter'),
  })
  .refine((data) => !!(data.identifier || data.identity), {
    message: 'Username atau Email wajib diisi',
    path: ['identifier'],
  })
  .transform((data) => ({
    identifier: (data.identifier || data.identity)!,
    password: data.password,
  }));

export const impersonateSchema = z.object({
  targetVendorId: z
    .string()
    .uuid('ID Vendor tidak valid'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ImpersonateInput = z.infer<typeof impersonateSchema>;
