import { Request, Response, NextFunction } from 'express';
import { counterpartSupplementaryService } from './supplementary.service';
import { createSupplementaryDocSchema } from './supplementary.schema';
import { presignedUrlSchema } from '../evidences/evidence.schema';
import { s3StorageService } from '../../../utils/s3';
import { AppError } from '../../../middlewares/errorHandler';
import { SupplementaryCategory } from '@prisma/client';
import { prisma } from '../../../config/database';

export class CounterpartSupplementaryController {
  async listDocs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Counterpart harus terafiliasi dengan Tenant perusahaan.');
      }

      let periodId = req.query.periodId as string;
      if (!periodId) {
        const latestPeriod = await prisma.assessmentPeriod.findFirst({
          where: { tenantId: req.user.tenantId },
          orderBy: { year: 'desc' },
        });
        if (!latestPeriod) {
          throw new AppError(404, 'PERIOD_NOT_FOUND', 'Belum ada periode penilaian aktif untuk perusahaan Anda.');
        }
        periodId = latestPeriod.id;
      }

      const docs = await counterpartSupplementaryService.listSupplementaryDocs(req.user.tenantId, periodId);

      res.status(200).json({
        success: true,
        data: docs,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPresignedUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Counterpart harus terafiliasi dengan Tenant perusahaan.');
      }

      const validation = presignedUrlSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data permintaan upload tidak valid',
          validation.error.format()
        );
      }

      const { fileName, mimeType, fileSizeBytes } = validation.data;
      const presigned = await s3StorageService.generatePresignedUploadUrl(
        req.user.tenantId,
        fileName,
        mimeType,
        fileSizeBytes
      );

      res.status(200).json({
        success: true,
        message: 'Presigned URL upload dokumen tambahan berhasil diterbitkan',
        data: presigned,
      });
    } catch (error) {
      next(error);
    }
  }

  async createDoc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Counterpart harus terafiliasi dengan Tenant perusahaan.');
      }

      const validation = createSupplementaryDocSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data dokumen tambahan tidak valid',
          validation.error.format()
        );
      }

      const doc = await counterpartSupplementaryService.createSupplementaryDoc(
        req.user.tenantId,
        req.user.userId,
        validation.data
      );

      res.status(201).json({
        success: true,
        message: 'Dokumen tambahan berhasil dicatat dan masuk antrean pemrosesan RAG',
        data: doc,
      });
    } catch (error) {
      next(error);
    }
  }

  async directUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Counterpart harus terafiliasi dengan Tenant perusahaan.');
      }

      if (!req.file) {
        throw new AppError(400, 'FILE_REQUIRED', 'Berkas dokumen wajib diunggah.');
      }

      const periodId = req.body.periodId;
      if (!periodId) {
        throw new AppError(400, 'MISSING_PERIOD_ID', 'Parameter periodId wajib disertakan.');
      }

      const category = (req.body.category as SupplementaryCategory) || SupplementaryCategory.FGD_FOLLOW_UP;

      const s3Res = await s3StorageService.uploadBuffer(req.user.tenantId, req.file);

      const doc = await counterpartSupplementaryService.createSupplementaryDoc(
        req.user.tenantId,
        req.user.userId,
        {
          periodId,
          fileName: req.file.originalname,
          fileUrl: s3Res.fileUrl,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          category,
          description: req.body.description || null,
          submissionNotes: req.body.submissionNotes || null,
        }
      );

      res.status(201).json({
        success: true,
        message: 'Dokumen tambahan berhasil diunggah langsung',
        data: doc,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteDoc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Counterpart harus terafiliasi dengan Tenant perusahaan.');
      }

      const id = req.params.id as string;
      const result = await counterpartSupplementaryService.deleteSupplementaryDoc(
        req.user.tenantId,
        req.user.userId,
        id
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const counterpartSupplementaryController = new CounterpartSupplementaryController();
export default counterpartSupplementaryController;
