import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { AppError } from './errorHandler';

/**
 * Daftar ekstensi file resmi yang diizinkan untuk diunggah ke sistem OpenRMI
 */
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.jpeg', '.jpg', '.png'] as const;

/**
 * Daftar MIME Types resmi yang diizinkan
 */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Validasi ekstensi dan tipe MIME file
 */
export function validateFileType(
  originalName: string,
  mimeType: string
): { isValid: boolean; message?: string } {
  const ext = path.extname(originalName).toLowerCase();

  const isExtValid = ALLOWED_EXTENSIONS.includes(ext as AllowedExtension);
  const isMimeValid = ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase() as AllowedMimeType);

  if (!isExtValid || !isMimeValid) {
    return {
      isValid: false,
      message: `Format berkas '${ext || 'tanpa ekstensi'}' dengan tipe '${mimeType}' tidak diizinkan. Hanya file format .pdf, .docx, .xlsx, .jpeg, .jpg, dan .png yang diperbolehkan.`,
    };
  }

  return { isValid: true };
}

// Konfigurasi Multer memory storage (buffer siap dikirim ke Cloudflare R2 / S3 Storage)
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Maksimal 50 Megabytes per file
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const check = validateFileType(file.originalname, file.mimetype);
    if (!check.isValid) {
      return cb(new AppError(400, 'INVALID_FILE_TYPE', check.message!));
    }
    cb(null, true);
  },
});

/**
 * Middleware untuk single file upload
 */
export const singleFileUpload = (fieldName: string) => {
  return upload.single(fieldName);
};

/**
 * Middleware untuk multiple file upload
 */
export const multipleFileUpload = (fieldName: string, maxCount = 10) => {
  return upload.array(fieldName, maxCount);
};
