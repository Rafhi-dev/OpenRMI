import { Request, Response, NextFunction } from 'express';
import { adminHealthService } from './health.service';

export class AdminHealthController {
  async checkHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await adminHealthService.checkSystemHealth();
      const statusCode = health.status === 'DOWN' ? 503 : 200;

      res.status(statusCode).json({
        success: health.status !== 'DOWN',
        data: health,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminHealthController = new AdminHealthController();
export default adminHealthController;
