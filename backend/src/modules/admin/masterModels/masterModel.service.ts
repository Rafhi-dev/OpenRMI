import prisma from '../../../config/database';
import { AppError } from '../../../middlewares/errorHandler';
import { logAuditEvent } from '../../../utils/auditLogger';

export class AdminMasterModelService {
  /**
   * Mengambil seluruh taksonomi regulasi KBUMN (Dimensi, Sub-Dimensi, Parameter, Kriteria)
   */
  async getAllTaxonomy() {
    return prisma.dimension.findMany({
      orderBy: { id: 'asc' },
      include: {
        subDimensions: {
          orderBy: { code: 'asc' },
          include: {
            parameters: {
              orderBy: { parameterNumber: 'asc' },
              include: {
                criteria: {
                  orderBy: [{ letterCode: 'asc' }, { level: 'asc' }],
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Mengambil detail satu parameter beserta seluruh kriteria level 1 s.d. 5
   */
  async getParameterByCode(code: string) {
    const parameter = await prisma.parameter.findUnique({
      where: { code },
      include: {
        subDimension: {
          include: {
            dimension: true,
          },
        },
        criteria: {
          orderBy: [{ letterCode: 'asc' }, { level: 'asc' }],
        },
      },
    });

    if (!parameter) {
      throw new AppError(404, 'PARAMETER_NOT_FOUND', `Parameter dengan kode '${code}' tidak ditemukan.`);
    }

    return parameter;
  }

  /**
   * Memperbarui panduan atau pernyataan kriteria penilaian (Kolom H & Kolom I)
   */
  async updateCriterion(
    adminId: string,
    id: number,
    data: { statement?: string; guidanceNotes?: string; defaultEvidences?: string }
  ) {
    const criterion = await prisma.criterion.findUnique({
      where: { id },
      include: { parameter: true },
    });

    if (!criterion) {
      throw new AppError(404, 'CRITERION_NOT_FOUND', 'Kriteria penilaian tidak ditemukan.');
    }

    const updated = await prisma.criterion.update({
      where: { id },
      data: {
        ...(data.statement ? { statement: data.statement } : {}),
        ...(data.guidanceNotes !== undefined ? { guidanceNotes: data.guidanceNotes } : {}),
        ...(data.defaultEvidences !== undefined ? { defaultEvidences: data.defaultEvidences } : {}),
      },
    });

    await logAuditEvent({
      userId: adminId,
      action: 'CRITERION_UPDATE',
      targetTable: 'criteria',
      targetId: String(id),
      oldValues: {
        statement: criterion.statement,
        guidanceNotes: criterion.guidanceNotes,
        defaultEvidences: criterion.defaultEvidences,
      },
      newValues: {
        statement: updated.statement,
        guidanceNotes: updated.guidanceNotes,
        defaultEvidences: updated.defaultEvidences,
      },
    });

    return updated;
  }

  /**
   * Memperbarui nama Master Dimensi (D1 s.d. D5)
   */
  async updateDimension(adminId: string, id: number, data: { name: string }) {
    const dim = await prisma.dimension.findUnique({ where: { id } });
    if (!dim) {
      throw new AppError(404, 'DIMENSION_NOT_FOUND', `Dimensi dengan ID ${id} tidak ditemukan.`);
    }

    const updated = await prisma.dimension.update({
      where: { id },
      data: { name: data.name.trim() },
    });

    await logAuditEvent({
      userId: adminId,
      action: 'DIMENSION_UPDATE',
      targetTable: 'dimensions',
      targetId: String(id),
      oldValues: { name: dim.name },
      newValues: { name: updated.name },
    });

    return updated;
  }

  /**
   * Memperbarui nama Sub-Dimensi
   */
  async updateSubDimension(adminId: string, id: number, data: { name: string }) {
    const subDim = await prisma.subDimension.findUnique({ where: { id } });
    if (!subDim) {
      throw new AppError(404, 'SUB_DIMENSION_NOT_FOUND', `Sub-Dimensi dengan ID ${id} tidak ditemukan.`);
    }

    const updated = await prisma.subDimension.update({
      where: { id },
      data: { name: data.name.trim() },
    });

    await logAuditEvent({
      userId: adminId,
      action: 'SUB_DIMENSION_UPDATE',
      targetTable: 'sub_dimensions',
      targetId: String(id),
      oldValues: { name: subDim.name },
      newValues: { name: updated.name },
    });

    return updated;
  }

  /**
   * Memperbarui Parameter RMI (Judul & Deskripsi)
   */
  async updateParameter(
    adminId: string,
    id: number,
    data: { title: string; description?: string }
  ) {
    const param = await prisma.parameter.findUnique({ where: { id } });
    if (!param) {
      throw new AppError(404, 'PARAMETER_NOT_FOUND', `Parameter dengan ID ${id} tidak ditemukan.`);
    }

    const updated = await prisma.parameter.update({
      where: { id },
      data: {
        title: data.title.trim(),
        description: data.description !== undefined ? data.description?.trim() : undefined,
      },
    });

    await logAuditEvent({
      userId: adminId,
      action: 'PARAMETER_UPDATE',
      targetTable: 'parameters',
      targetId: String(id),
      oldValues: { title: param.title, description: param.description },
      newValues: { title: updated.title, description: updated.description },
    });

    return updated;
  }
}

export const adminMasterModelService = new AdminMasterModelService();
export default adminMasterModelService;
