import prisma from '../../../config/database';
import { AppError } from '../../../middlewares/errorHandler';
import { logAuditEvent } from '../../../utils/auditLogger';
import { validateFileType } from '../../../middlewares/fileValidator';
import { s3StorageService } from '../../../utils/s3';
import { CreateSupplementaryDocInput } from './supplementary.schema';
import { addDocumentIngestionJob } from '../../ai/queue/rag.queue';

export class CounterpartSupplementaryService {
  /**
   * Mengambil daftar dokumen tambahan pasca-FGD milik tenant
   * INVARIAN KEAMANAN MUTLAK: Catatan internal asesor dan analysisResults TIDAK BOLEH disertakan
   */
  async listSupplementaryDocs(tenantId: string, periodId: string) {
    return prisma.supplementaryDocument.findMany({
      where: { tenantId, periodId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        periodId: true,
        fileName: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
        category: true,
        description: true,
        submissionNotes: true,
        ragIngestionStatus: true,
        createdAt: true,
        // STRICT OMISSION: analysisResults & assessorNotes are deliberately NOT queried
      },
    });
  }

  /**
   * Mengunggah dokumen tambahan pasca-FGD
   */
  async createSupplementaryDoc(
    tenantId: string,
    userId: string,
    input: CreateSupplementaryDocInput
  ) {
    // 1. Validasi Whitelist Tipe Berkas (HANYA pdf, docx, xlsx, jpeg, jpg, png)
    const check = validateFileType(input.fileName, input.mimeType);
    if (!check.isValid) {
      throw new AppError(400, 'INVALID_FILE_TYPE', check.message!);
    }

    // 2. Verifikasi kepemilikan periode
    const period = await prisma.assessmentPeriod.findFirst({
      where: { id: input.periodId, tenantId },
    });
    if (!period) {
      throw new AppError(404, 'PERIOD_NOT_FOUND', 'Periode penilaian tidak ditemukan pada tenant ini.');
    }

    const doc = await prisma.supplementaryDocument.create({
      data: {
        tenantId,
        periodId: input.periodId,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        category: input.category,
        description: input.description,
        submissionNotes: input.submissionNotes,
        ragIngestionStatus: 'PENDING',
      },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileSize: true,
        category: true,
        ragIngestionStatus: true,
        createdAt: true,
      },
    });

    await logAuditEvent({
      tenantId,
      userId,
      action: 'SUPPLEMENTARY_DOC_UPLOAD',
      targetTable: 'supplementary_documents',
      targetId: doc.id,
      newValues: { fileName: doc.fileName, category: doc.category, fileSize: doc.fileSize },
    });

    // Pemicu antrean ingestion background RAG (MinerU ekstraksi + embedding)
    await addDocumentIngestionJob({
      tenantId,
      supplementaryDocId: doc.id,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
    });

    return doc;
  }

  /**
   * Menghapus dokumen tambahan
   */
  async deleteSupplementaryDoc(tenantId: string, userId: string, id: string) {
    const doc = await prisma.supplementaryDocument.findFirst({
      where: { id, tenantId },
    });

    if (!doc) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Dokumen tambahan tidak ditemukan.');
    }

    await s3StorageService.deleteFile(doc.fileUrl);

    await prisma.supplementaryDocument.delete({
      where: { id },
    });

    await logAuditEvent({
      tenantId,
      userId,
      action: 'SUPPLEMENTARY_DOC_DELETE',
      targetTable: 'supplementary_documents',
      targetId: id,
      oldValues: { fileName: doc.fileName, fileUrl: doc.fileUrl },
    });

    return { message: 'Dokumen tambahan berhasil dihapus.' };
  }
}

export const counterpartSupplementaryService = new CounterpartSupplementaryService();
export default counterpartSupplementaryService;
