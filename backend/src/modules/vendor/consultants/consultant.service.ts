import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import prisma from '../../../config/database';
import { AppError } from '../../../middlewares/errorHandler';
import { logAuditEvent } from '../../../utils/auditLogger';
import { CreateConsultantInput, UpdateConsultantInput } from './consultant.schema';

export class VendorConsultantService {
  async listConsultants(vendorId: string, query: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      vendorId,
      role: UserRole.EXTERNAL_CONSULTANT,
    };

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { username: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, consultants] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          agencyName: true,
          isActive: true,
          createdAt: true,
          assignments: {
            where: { isActive: true },
            include: {
              tenant: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
    ]);

    return {
      consultants,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async registerConsultant(vendorId: string, createdByUserId: string, input: CreateConsultantInput) {
    // 1. Cek keunikan email dan username
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: input.email.toLowerCase() },
          { username: input.username.toLowerCase() },
        ],
      },
    });

    if (existing) {
      if (existing.email.toLowerCase() === input.email.toLowerCase()) {
        throw new AppError(409, 'EMAIL_EXISTS', `Email '${input.email}' sudah terdaftar.`);
      }
      throw new AppError(409, 'USERNAME_EXISTS', `Username '${input.username}' sudah digunakan.`);
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    // 3. Buat user konsultan eksternal
    const consultant = await prisma.user.create({
      data: {
        vendorId,
        role: UserRole.EXTERNAL_CONSULTANT,
        fullName: input.fullName,
        username: input.username,
        email: input.email.toLowerCase(),
        passwordHash,
        agencyName: input.agencyName,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        role: true,
        agencyName: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAuditEvent({
      vendorId,
      userId: createdByUserId,
      action: 'CONSULTANT_REGISTER',
      targetTable: 'users',
      targetId: consultant.id,
      newValues: { fullName: consultant.fullName, email: consultant.email, username: consultant.username },
    });

    return consultant;
  }

  async updateConsultant(vendorId: string, consultantId: string, input: UpdateConsultantInput) {
    const consultant = await prisma.user.findFirst({
      where: { id: consultantId, vendorId, role: UserRole.EXTERNAL_CONSULTANT },
    });

    if (!consultant) {
      throw new AppError(404, 'CONSULTANT_NOT_FOUND', 'Akun konsultan tidak ditemukan di lembaga Anda.');
    }

    const updated = await prisma.user.update({
      where: { id: consultantId },
      data: {
        ...(input.fullName ? { fullName: input.fullName } : {}),
        ...(input.email ? { email: input.email.toLowerCase() } : {}),
        ...(input.agencyName !== undefined ? { agencyName: input.agencyName } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        agencyName: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return updated;
  }
}

export const vendorConsultantService = new VendorConsultantService();
export default vendorConsultantService;
