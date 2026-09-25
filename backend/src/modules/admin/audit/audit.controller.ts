import { Request, Response, NextFunction } from 'express';
import { adminAuditService } from './audit.service';

export class AdminAuditController {
  async listLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const action = req.query.action as string;
      const vendorId = req.query.vendorId as string;
      const userId = req.query.userId as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const result = await adminAuditService.listAuditLogs({
        page,
        limit,
        action,
        vendorId,
        userId,
        startDate,
        endDate,
      });

      res.status(200).json({
        success: true,
        data: result.logs,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminAuditController = new AdminAuditController();
export default adminAuditController;
