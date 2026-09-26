import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { s3StorageService } from '../../utils/s3';
import { AppError } from '../../middlewares/errorHandler';
import { UserRole } from '@prisma/client';

export class FileController {
  /**
   * Stream berkas bukti kriteria (CriterionEvidence) dengan otorisasi multi-tenant RBAC
   */
  async streamEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new AppError(400, 'BAD_REQUEST', 'ID berkas bukti wajib disertakan.');
      }

      const evidence = await prisma.criterionEvidence.findUnique({
        where: { id },
      });

      if (!evidence) {
        throw new AppError(404, 'FILE_NOT_FOUND', 'Berkas bukti dukung tidak ditemukan.');
      }

      // Validasi Otorisasi Berbasis Peran
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan untuk melihat berkas.');
      }

      if (user.role === UserRole.ADMINISTRATOR) {
        // Super Admin memiliki akses global
      } else if (user.role === UserRole.COUNTERPART_TEAM) {
        if (evidence.tenantId !== user.tenantId) {
          throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki hak akses pada berkas tenant lain.');
        }
      } else if (user.role === UserRole.EXTERNAL_CONSULTANT) {
        const assignment = await prisma.consultantAssignment.findFirst({
          where: {
            consultantId: user.userId,
            period: { tenantId: evidence.tenantId },
            isActive: true,
          },
        });
        if (!assignment) {
          throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki surat penugasan aktif pada tenant dokumen ini.');
        }
      } else if (user.role === UserRole.VENDOR) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: evidence.tenantId },
        });
        if (tenant?.vendorId !== user.vendorId) {
          throw new AppError(403, 'FORBIDDEN', 'Tenant ini bukan bagian dari portofolio vendor Anda.');
        }
      }

      // Ambil stream dari S3/R2
      const fileData = await s3StorageService.getFileStream(evidence.fileUrl);

      // Set header untuk streaming inline (PDF & Image viewer)
      const mimeType = evidence.mimeType || fileData.contentType || 'application/pdf';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(evidence.fileName)}"`);
      if (evidence.fileSize || fileData.contentLength) {
        res.setHeader('Content-Length', (evidence.fileSize || fileData.contentLength)!.toString());
      }
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.removeHeader('X-Frame-Options');

      fileData.stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stream berkas dokumen tambahan pasca-FGD (SupplementaryDocument) dengan otorisasi multi-tenant RBAC
   */
  async streamSupplementary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new AppError(400, 'BAD_REQUEST', 'ID dokumen tambahan wajib disertakan.');
      }

      const doc = await prisma.supplementaryDocument.findUnique({
        where: { id },
      });

      if (!doc) {
        throw new AppError(404, 'FILE_NOT_FOUND', 'Dokumen tambahan tidak ditemukan.');
      }

      // Validasi Otorisasi Berbasis Peran
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan untuk melihat berkas.');
      }

      if (user.role === UserRole.ADMINISTRATOR) {
        // Super Admin memiliki akses global
      } else if (user.role === UserRole.COUNTERPART_TEAM) {
        if (doc.tenantId !== user.tenantId) {
          throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki hak akses pada berkas tenant lain.');
        }
      } else if (user.role === UserRole.EXTERNAL_CONSULTANT) {
        const assignment = await prisma.consultantAssignment.findFirst({
          where: {
            consultantId: user.userId,
            periodId: doc.periodId,
            isActive: true,
          },
        });
        if (!assignment) {
          throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki penugasan aktif pada dokumen periode ini.');
        }
      } else if (user.role === UserRole.VENDOR) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: doc.tenantId },
        });
        if (tenant?.vendorId !== user.vendorId) {
          throw new AppError(403, 'FORBIDDEN', 'Tenant ini bukan bagian dari portofolio vendor Anda.');
        }
      }

      const fileData = await s3StorageService.getFileStream(doc.fileUrl);

      const mimeType = doc.mimeType || fileData.contentType || 'application/pdf';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`);
      if (doc.fileSize || fileData.contentLength) {
        res.setHeader('Content-Length', (doc.fileSize || fileData.contentLength)!.toString());
      }
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.removeHeader('X-Frame-Options');

      fileData.stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
}

export const fileController = new FileController();
export default fileController;
