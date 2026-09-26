import { Request, Response, NextFunction } from 'express';
import { adminMasterModelService } from './masterModel.service';
import { AppError } from '../../../middlewares/errorHandler';

export class AdminMasterModelController {
  async getAllTaxonomy(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taxonomy = await adminMasterModelService.getAllTaxonomy();
      res.status(200).json({
        success: true,
        data: taxonomy,
      });
    } catch (error) {
      next(error);
    }
  }

  async getParameterByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.params.code as string;
      const parameter = await adminMasterModelService.getParameterByCode(code);
      res.status(200).json({
        success: true,
        data: parameter,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateDimension(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan');
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) throw new AppError(400, 'INVALID_ID', 'ID Dimensi harus berupa angka');

      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        throw new AppError(400, 'INVALID_NAME', 'Nama dimensi wajib diisi');
      }

      const updated = await adminMasterModelService.updateDimension(req.user.userId, id, { name });
      res.status(200).json({
        success: true,
        message: 'Dimensi berhasil diperbarui',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSubDimension(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan');
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) throw new AppError(400, 'INVALID_ID', 'ID Sub-Dimensi harus berupa angka');

      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        throw new AppError(400, 'INVALID_NAME', 'Nama sub-dimensi wajib diisi');
      }

      const updated = await adminMasterModelService.updateSubDimension(req.user.userId, id, { name });
      res.status(200).json({
        success: true,
        message: 'Sub-Dimensi berhasil diperbarui',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateParameter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan');
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) throw new AppError(400, 'INVALID_ID', 'ID Parameter harus berupa angka');

      const { title, description } = req.body;
      if (!title || typeof title !== 'string' || !title.trim()) {
        throw new AppError(400, 'INVALID_TITLE', 'Judul parameter wajib diisi');
      }

      const updated = await adminMasterModelService.updateParameter(req.user.userId, id, {
        title,
        description,
      });
      res.status(200).json({
        success: true,
        message: 'Parameter berhasil diperbarui',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCriterion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan');

      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) throw new AppError(400, 'INVALID_ID', 'ID Kriteria harus berupa angka');

      const updated = await adminMasterModelService.updateCriterion(req.user.userId, id, req.body);
      res.status(200).json({
        success: true,
        message: 'Kriteria berhasil diperbarui',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminMasterModelController = new AdminMasterModelController();
export default adminMasterModelController;
