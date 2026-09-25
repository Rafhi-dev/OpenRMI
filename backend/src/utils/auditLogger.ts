import prisma from '../config/database';

export interface CreateAuditLogParams {
  vendorId?: string | null;
  tenantId?: string | null;
  userId?: string | null;
  impersonatedByAdminId?: string | null;
  action: string; // e.g. SCORE_EDIT, EVIDENCE_UPLOAD, VENDOR_IMPERSONATE, STATUS_CHANGE, LOGIN, LOGOUT
  targetTable: string;
  targetId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export const logAuditEvent = async (params: CreateAuditLogParams): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        vendorId: params.vendorId || null,
        tenantId: params.tenantId || null,
        userId: params.userId || null,
        impersonatedByAdminId: params.impersonatedByAdminId || null,
        action: params.action,
        targetTable: params.targetTable,
        targetId: params.targetId,
        oldValues: (params.oldValues as any) || undefined,
        newValues: (params.newValues as any) || undefined,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    // Non-blocking fail-safe: log audit error to console so it does not interrupt user flow
    console.error('[AuditTrail Dispatch Error]:', error);
  }
};
