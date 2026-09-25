import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import prisma from '../config/database';

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

// Cache in-memory untuk batas ukuran upload (MB) dengan TTL 60 detik
let cachedMaxUploadMb: number = 50;
let lastCacheTime: number = 0;
const CACHE_TTL_MS = 60 * 1000;

export async function getMaxUploadFileSizeMb(): Promise<number> {
  const now = Date.now();
  if (now - lastCacheTime < CACHE_TTL_MS && cachedMaxUploadMb > 0) {
    return cachedMaxUploadMb;
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { id: 'global_system_setting' },
    });
    if (setting?.maxUploadFileSizeMb) {
      cachedMaxUploadMb = setting.maxUploadFileSizeMb;
      lastCacheTime = now;
      return cachedMaxUploadMb;
    }
  } catch (err) {
    console.warn('[FileValidator] Gagal membaca maxUploadFileSizeMb dari DB, menggunakan fallback 50MB:', err);
  }

  return cachedMaxUploadMb;
}

export function setMaxUploadFileSizeCache(newLimitMb: number): void {
  cachedMaxUploadMb = newLimitMb;
  lastCacheTime = Date.now();
}

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

const rawUpload = multer({
  storage,
  limits: {
    // Alokasi buffer maksimum di layer Multer (misal hingga 500MB)
    // Pengecekan riil terhadap dynamic setting dilakukan di middleware pembungkus
    fileSize: 500 * 1024 * 1024,
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
 * Middleware untuk single file upload dengan pengecekan batas dinamis dari Admin
 */
export const dynamicSingleFileUpload = (fieldName: string) => {
  const multerMiddleware = rawUpload.single(fieldName);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const maxMb = await getMaxUploadFileSizeMb();
    const maxBytes = maxMb * 1024 * 1024;

    // Fast reject berdasarkan content-length header
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength, 10) > maxBytes + 1024 * 1024) {
      return next(
        new AppError(
          400,
          'FILE_TOO_LARGE',
          `Ukuran unggahan melebihi batas maksimum sistem yang ditetapkan Administrator (${maxMb} MB).`
        )
      );
    }

    multerMiddleware(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new AppError(
              400,
              'FILE_TOO_LARGE',
              `Ukuran berkas melebihi batas maksimum sistem (${maxMb} MB).`
            )
          );
        }
        return next(err);
      }

      // Validasi ukuran aktual file setelah diterima
      if (req.file && req.file.size > maxBytes) {
        return next(
          new AppError(
            400,
            'FILE_TOO_LARGE',
            `Ukuran berkas '${req.file.originalname}' (${(req.file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimum yang ditetapkan Administrator (${maxMb} MB).`
          )
        );
      }

      next();
    });
  };
};

export const upload = rawUpload;
export const singleFileUpload = dynamicSingleFileUpload;
