import { Request, Response, NextFunction } from 'express';
import { counterpartEvidenceService } from './evidence.service';
import { presignedUrlSchema, createEvidenceSchema } from './evidence.schema';
import { s3StorageService } from '../../../utils/s3';
import { AppError } from '../../../middlewares/errorHandler';

export class CounterpartEvidenceController {
  async getChecklist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Counterpart harus terafiliasi dengan Tenant perusahaan.');
      }

      const parameterCode = req.query.parameterCode as string;
      const checklist = await counterpartEvidenceService.getEvidenceChecklist(req.user.tenantId, parameterCode);

      const uploadedCount = checklist.filter((item: any) => item.isUploaded).length;

      res.status(200).json({
        success: true,
        data: checklist,
        meta: {
          totalCriteria: checklist.length,
          uploadedEvidences: uploadedCount,
        },
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
        message: 'Presigned URL upload berhasil diterbitkan',
        data: presigned,
      });
    } catch (error) {
      next(error);
    }
  }

  async createEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Counterpart harus terafiliasi dengan Tenant perusahaan.');
      }

      const validation = createEvidenceSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data dokumen bukti tidak valid',
          validation.error.format()
        );
      }

      const evidence = await counterpartEvidenceService.createEvidence(
        req.user.tenantId,
        req.user.userId,
        validation.data
      );

      res.status(201).json({
        success: true,
        message: 'Dokumen bukti berhasil dicatat ke dalam sistem',
        data: evidence,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Counterpart harus terafiliasi dengan Tenant perusahaan.');
      }

      const id = req.params.id as string;
      const result = await counterpartEvidenceService.deleteEvidence(req.user.tenantId, req.user.userId, id);

      res.status(200).json({
        success: true,
        message: result.message,
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

      const criterionId = parseInt(req.body.criterionId, 10);
      if (isNaN(criterionId)) {
        throw new AppError(400, 'INVALID_CRITERION_ID', 'ID Kriteria wajib disertakan berupa angka.');
      }

      // Upload buffer ke S3
      const s3Res = await s3StorageService.uploadBuffer(req.user.tenantId, req.file);

      // Simpan metadata bukti
      const evidence = await counterpartEvidenceService.createEvidence(req.user.tenantId, req.user.userId, {
        criterionId,
        fileName: req.file.originalname,
        fileUrl: s3Res.fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        docNumber: req.body.docNumber || null,
        effectiveDate: req.body.effectiveDate || null,
        sectionNotes: req.body.sectionNotes || null,
      });

      res.status(201).json({
        success: true,
        message: 'Berkas berhasil diunggah langsung dan dicatat',
        data: evidence,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const counterpartEvidenceController = new CounterpartEvidenceController();
export default counterpartEvidenceController;
