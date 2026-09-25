import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppError } from '../middlewares/errorHandler';
import { validateFileType, getMaxUploadFileSizeMb } from '../middlewares/fileValidator';
import path from 'path';

// Inisialisasi S3 / Cloudflare R2 Client
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET || 'media-rmi-axpnli';

export interface PresignedUploadResult {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  storageKey: string;
  expiresInSeconds: number;
}

export class S3StorageService {
  /**
   * Menghasilkan Presigned URL untuk upload berkas langsung dari frontend ke Cloudflare R2
   */
  async generatePresignedUploadUrl(
    tenantId: string,
    fileName: string,
    mimeType: string,
    fileSizeBytes?: number
  ): Promise<PresignedUploadResult> {
    // 1. Validasi Whitelist Tipe Berkas (HANYA pdf, docx, xlsx, jpeg, jpg, png)
    const check = validateFileType(fileName, mimeType);
    if (!check.isValid) {
      throw new AppError(400, 'INVALID_FILE_TYPE', check.message!);
    }

    // 2. Validasi Batas Ukuran Berkas Dinamis dari Admin
    const maxMb = await getMaxUploadFileSizeMb();
    const maxBytes = maxMb * 1024 * 1024;
    if (fileSizeBytes && fileSizeBytes > maxBytes) {
      throw new AppError(
        400,
        'FILE_TOO_LARGE',
        `Ukuran berkas (${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimum sistem (${maxMb} MB).`
      );
    }

    // 3. Sanitasi nama file dan bangun S3 Key unik
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const key = `tenants/${tenantId}/${timestamp}_${randomSuffix}_${cleanFileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: mimeType,
    });

    const expiresInSeconds = 15 * 60; // 15 menit
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });

    // URL publik/target dokumen
    const endpointHost = process.env.S3_ENDPOINT?.replace('https://', '') || '';
    const fileUrl = `https://${BUCKET_NAME}.${endpointHost}/${key}`;

    return {
      uploadUrl,
      fileUrl,
      key,
      storageKey: key,
      expiresInSeconds,
    };
  }

  /**
   * Menghasilkan Presigned URL berdurasi terbatas (15 menit) untuk preview / unduh dokumen bukti terenkripsi
   */
  async generatePresignedDownloadUrl(fileKey: string): Promise<string> {
    const cleanKey = fileKey.includes('.com/') ? fileKey.split('.com/')[1] : fileKey;

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: cleanKey,
    });

    return getSignedUrl(s3Client, command, { expiresIn: 15 * 60 });
  }

  /**
   * Upload langsung dari Buffer (Fallback Multer)
   */
  async uploadBuffer(
    tenantId: string,
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number }
  ): Promise<{ fileUrl: string; key: string }> {
    const check = validateFileType(file.originalname, file.mimetype);
    if (!check.isValid) {
      throw new AppError(400, 'INVALID_FILE_TYPE', check.message!);
    }

    const maxMb = await getMaxUploadFileSizeMb();
    if (file.size > maxMb * 1024 * 1024) {
      throw new AppError(
        400,
        'FILE_TOO_LARGE',
        `Ukuran berkas melebihi batas maksimum sistem (${maxMb} MB).`
      );
    }

    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `tenants/${tenantId}/${Date.now()}_${cleanFileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);

    const endpointHost = process.env.S3_ENDPOINT?.replace('https://', '') || '';
    const fileUrl = `https://${BUCKET_NAME}.${endpointHost}/${key}`;

    return { fileUrl, key };
  }

  /**
   * Menghapus berkas dari Cloudflare R2 / S3
   */
  async deleteFile(fileKey: string): Promise<void> {
    const cleanKey = fileKey.includes('.com/') ? fileKey.split('.com/')[1] : fileKey;

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: cleanKey,
    });

    await s3Client.send(command).catch((err) => {
      console.warn(`[S3 Storage] Gagal menghapus file ${cleanKey}:`, err.message);
    });
  }
}

export const s3StorageService = new S3StorageService();
export default s3StorageService;
