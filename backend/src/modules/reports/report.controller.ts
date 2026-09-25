import { Request, Response, NextFunction } from 'express';
import { reportService } from './report.service';
import { AppError } from '../../middlewares/errorHandler';

export class ReportController {
  async getFullReportData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const periodId = req.params.periodId as string;
      if (!periodId) {
        throw new AppError(400, 'MISSING_PERIOD_ID', 'Parameter periodId dalam URL diperlukan.');
      }

      const data = await reportService.compileFullReportData(
        req.user.userId,
        req.user.role,
        req.user.tenantId,
        periodId
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async exportExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const periodId = req.params.periodId as string;
      if (!periodId) {
        throw new AppError(400, 'MISSING_PERIOD_ID', 'Parameter periodId dalam URL diperlukan.');
      }

      const { buffer, fileName } = await reportService.generateExcelReport(
        req.user.userId,
        req.user.role,
        req.user.tenantId,
        periodId
      );

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', buffer.length);

      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async exportSummaryPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const periodId = req.params.periodId as string;
      if (!periodId) {
        throw new AppError(400, 'MISSING_PERIOD_ID', 'Parameter periodId dalam URL diperlukan.');
      }

      const { buffer, fileName } = await reportService.generatePdfSummary(
        req.user.userId,
        req.user.role,
        req.user.tenantId,
        periodId
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', buffer.length);

      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
