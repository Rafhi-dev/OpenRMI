import { API_BASE_URL } from './api';

/**
 * Mendapatkan URL streaming berkas dokumen yang aman dan terautentikasi
 * Mengalirkan berkas melalui proxy Express backend sehingga tidak terkena CORS atau error autentikasi S3/R2
 */
export function getFileUrl(
  fileItem: { id?: string; fileUrl?: string } | null | undefined,
  type: 'evidence' | 'supplementary' = 'evidence'
): string {
  if (!fileItem) return '#';
  if (fileItem.id) {
    return `${API_BASE_URL}/files/${type}/${fileItem.id}`;
  }
  return fileItem.fileUrl || '#';
}
