import prisma from '../../../config/database';
import { AppError } from '../../../middlewares/errorHandler';
import { logAuditEvent } from '../../../utils/auditLogger';
import { validateFileType } from '../../../middlewares/fileValidator';
import { s3StorageService } from '../../../utils/s3';
import { CreateEvidenceInput } from './evidence.schema';
import { addDocumentIngestionJob } from '../../ai/queue/rag.queue';

export class CounterpartEvidenceService {
  /**
   * Mengambil checklist dokumen wajib per parameter / seluruh parameter
   */
  async getEvidenceChecklist(tenantId: string, parameterCode?: string) {
    const where: any = {};
    if (parameterCode) {
      where.code = parameterCode;
    }

    const parameters = await prisma.parameter.findMany({
      where,
      orderBy: { parameterNumber: 'asc' },
      include: {
        subDimension: {
          include: { dimension: true },
        },
        criteria: {
          orderBy: [{ letterCode: 'asc' }, { level: 'asc' }],
          include: {
            evidences: {
              where: { tenantId },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    return parameters.map((param) => {
      const totalCriteria = param.criteria.length;
      const criteriaWithEvidence = param.criteria.filter((c) => c.evidences.length > 0).length;
      const isComplete = totalCriteria > 0 && criteriaWithEvidence === totalCriteria;

      return {
        parameterId: param.id,
        parameterCode: param.code,
        parameterNumber: param.parameterNumber,
        title: param.title,
        dimension: param.subDimension.dimension.name,
        subDimension: param.subDimension.name,
        totalCriteria,
        criteriaWithEvidence,
        isComplete,
        criteria: param.criteria.map((c) => ({
          criterionId: c.id,
          letterCode: c.letterCode,
          level: c.level,
          statement: c.statement,
          guidanceNotes: c.guidanceNotes,
          defaultEvidences: c.defaultEvidences,
          evidences: c.evidences,
        })),
      };
    });
  }

  /**
   * Menyimpan metadata dokumen bukti yang telah diunggah ke storage
   */
  async createEvidence(tenantId: string, userId: string, input: CreateEvidenceInput) {
    // 1. Validasi Whitelist File Type (HANYA pdf, docx, xlsx, jpeg, jpg, png)
    const check = validateFileType(input.fileName, input.mimeType);
    if (!check.isValid) {
      throw new AppError(400, 'INVALID_FILE_TYPE', check.message!);
    }

    // 2. Verifikasi kriteria valid
    const criterion = await prisma.criterion.findUnique({
      where: { id: input.criterionId },
      include: { parameter: true },
    });
    if (!criterion) {
      throw new AppError(404, 'CRITERION_NOT_FOUND', 'Kriteria penilaian tidak ditemukan.');
    }

    const evidence = await prisma.criterionEvidence.create({
      data: {
        tenantId,
        criterionId: input.criterionId,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        docNumber: input.docNumber,
        effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null,
        sectionNotes: input.sectionNotes,
      },
    });

    await logAuditEvent({
      tenantId,
      userId,
      action: 'EVIDENCE_UPLOAD',
      targetTable: 'criterion_evidences',
      targetId: evidence.id,
      newValues: {
        fileName: evidence.fileName,
        fileSize: evidence.fileSize,
        parameterCode: criterion.parameter.code,
        criterionLetter: criterion.letterCode,
      },
    });

    // Pemicu antrean ingestion background RAG (MinerU ekstraksi + embedding)
    await addDocumentIngestionJob({
      tenantId,
      evidenceId: evidence.id,
      fileName: evidence.fileName,
      fileUrl: evidence.fileUrl,
    });

    return evidence;
  }

  /**
   * Menghapus dokumen bukti pendukung
   */
  async deleteEvidence(tenantId: string, userId: string, evidenceId: string) {
    const evidence = await prisma.criterionEvidence.findFirst({
      where: { id: evidenceId, tenantId },
    });

    if (!evidence) {
      throw new AppError(404, 'EVIDENCE_NOT_FOUND', 'Dokumen bukti tidak ditemukan.');
    }

    // Hapus dari S3 Storage bila memungkinkan
    await s3StorageService.deleteFile(evidence.fileUrl);

    await prisma.criterionEvidence.delete({
      where: { id: evidenceId },
    });

    await logAuditEvent({
      tenantId,
      userId,
      action: 'EVIDENCE_DELETE',
      targetTable: 'criterion_evidences',
      targetId: evidenceId,
      oldValues: { fileName: evidence.fileName, fileUrl: evidence.fileUrl },
    });

    return { message: 'Dokumen bukti berhasil dihapus.' };
  }
}

export const counterpartEvidenceService = new CounterpartEvidenceService();
export default counterpartEvidenceService;
