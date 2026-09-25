import { z } from 'zod';

export const updateSystemSettingsSchema = z.object({
  maxUploadFileSizeMb: z
    .number({ invalid_type_error: 'Batas ukuran file harus berupa angka' })
    .int('Batas ukuran file harus berupa bilangan bulat')
    .min(1, 'Batas ukuran file minimal 1 MB')
    .max(500, 'Batas ukuran file maksimal 500 MB'),
  allowedFileTypes: z
    .string()
    .optional(),
});

export type UpdateSystemSettingsInput = z.infer<typeof updateSystemSettingsSchema>;
