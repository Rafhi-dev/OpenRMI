import prisma from '../../../config/database';
import { AppError } from '../../../middlewares/errorHandler';
import { logAuditEvent } from '../../../utils/auditLogger';
import { CreateAssignmentInput, UpdateAssignmentInput } from './assignment.schema';

export class VendorAssignmentService {
  async listAssignments(vendorId: string, query: { tenantId?: string; consultantId?: string; isActive?: boolean }) {
    const where: any = {
      tenant: { vendorId },
    };

    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.consultantId) where.consultantId = query.consultantId;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return prisma.consultantAssignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { id: true, name: true, code: true } },
        consultant: { select: { id: true, fullName: true, email: true, username: true } },
      },
    });
  }

  async assignConsultant(vendorId: string, createdByUserId: string, input: CreateAssignmentInput) {
    // 1. Verifikasi tenant milik vendor
    const tenant = await prisma.tenant.findFirst({
      where: { id: input.tenantId, vendorId },
    });
    if (!tenant) {
      throw new AppError(404, 'TENANT_NOT_FOUND', 'Perusahaan klien tidak ditemukan dalam portofolio Anda.');
    }

    // 2. Verifikasi konsultan milik vendor
    const consultant = await prisma.user.findFirst({
      where: { id: input.consultantId, vendorId },
    });
    if (!consultant) {
      throw new AppError(404, 'CONSULTANT_NOT_FOUND', 'Konsultan tidak ditemukan dalam tim lembaga Anda.');
    }

    // 3. Verifikasi periode penilaian milik tenant
    const period = await prisma.assessmentPeriod.findFirst({
      where: { id: input.periodId, tenantId: input.tenantId },
    });
    if (!period) {
      throw new AppError(404, 'PERIOD_NOT_FOUND', 'Periode penilaian tidak ditemukan pada tenant tersebut.');
    }

    // 4. Cek apakah sudah pernah ditugaskan
    const existing = await prisma.consultantAssignment.findFirst({
      where: {
        tenantId: input.tenantId,
        consultantId: input.consultantId,
        periodId: input.periodId,
        isActive: true,
      },
    });
    if (existing) {
      throw new AppError(409, 'ALREADY_ASSIGNED', 'Konsultan sudah memiliki penugasan aktif pada periode ini.');
    }

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (end <= start) {
      throw new AppError(400, 'INVALID_DATE_RANGE', 'Tanggal selesai harus setelah tanggal mulai.');
    }

    const assignment = await prisma.consultantAssignment.create({
      data: {
        tenantId: input.tenantId,
        consultantId: input.consultantId,
        periodId: input.periodId,
        startDate: start,
        endDate: end,
        ndaDocumentUrl: input.ndaDocumentUrl,
        isActive: true,
      },
      include: {
        tenant: { select: { id: true, name: true, code: true } },
        consultant: { select: { id: true, fullName: true, email: true } },
      },
    });

    await logAuditEvent({
      vendorId,
      tenantId: input.tenantId,
      userId: createdByUserId,
      action: 'CONSULTANT_ASSIGN',
      targetTable: 'consultant_assignments',
      targetId: assignment.id,
      newValues: {
        consultantName: consultant.fullName,
        tenantName: tenant.name,
        periodYear: period.year,
      },
    });

    return assignment;
  }

  async updateAssignment(vendorId: string, assignmentId: string, input: UpdateAssignmentInput) {
    const assignment = await prisma.consultantAssignment.findFirst({
      where: { id: assignmentId, tenant: { vendorId } },
    });

    if (!assignment) {
      throw new AppError(404, 'ASSIGNMENT_NOT_FOUND', 'Data penugasan tidak ditemukan.');
    }

    const updated = await prisma.consultantAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(input.endDate ? { endDate: new Date(input.endDate) } : {}),
        ...(input.ndaDocumentUrl !== undefined ? { ndaDocumentUrl: input.ndaDocumentUrl } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    return updated;
  }
}

export const vendorAssignmentService = new VendorAssignmentService();
export default vendorAssignmentService;
