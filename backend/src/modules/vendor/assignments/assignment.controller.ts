import { Request, Response, NextFunction } from 'express';
import { vendorAssignmentService } from './assignment.service';
import { createAssignmentSchema, updateAssignmentSchema } from './assignment.schema';
import { AppError } from '../../../middlewares/errorHandler';

export class VendorAssignmentController {
  async listAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.vendorId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Anda tidak terafiliasi dengan vendor mana pun');
      }

      const tenantId = req.query.tenantId as string;
      const consultantId = req.query.consultantId as string;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

      const assignments = await vendorAssignmentService.listAssignments(req.user.vendorId, {
        tenantId,
        consultantId,
        isActive,
      });

      res.status(200).json({
        success: true,
        data: assignments,
      });
    } catch (error) {
      next(error);
    }
  }

  async assignConsultant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.vendorId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Anda tidak terafiliasi dengan vendor mana pun');
      }

      const validation = createAssignmentSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data penugasan tidak valid',
          validation.error.format()
        );
      }

      const assignment = await vendorAssignmentService.assignConsultant(
        req.user.vendorId,
        req.user.userId,
        validation.data
      );

      res.status(201).json({
        success: true,
        message: 'Konsultan berhasil ditugaskan ke perusahaan klien',
        data: assignment,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.vendorId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Anda tidak terafiliasi dengan vendor mana pun');
      }

      const validation = updateAssignmentSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data pembaruan penugasan tidak valid',
          validation.error.format()
        );
      }

      const id = req.params.id as string;
      const updated = await vendorAssignmentService.updateAssignment(
        req.user.vendorId,
        id,
        validation.data
      );

      res.status(200).json({
        success: true,
        message: 'Status penugasan berhasil diperbarui',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const vendorAssignmentController = new VendorAssignmentController();
export default vendorAssignmentController;
