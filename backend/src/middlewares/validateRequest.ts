import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler';

interface RequestValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Middleware pemvalidasi request menggunakan Zod schema
 * Memvalidasi body, query, dan params secara ketat untuk setiap operasi CRUD
 */
export const validateRequest = (schemas: RequestValidationSchemas) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstIssue = error.issues[0];
        const errorMessage = firstIssue
          ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
          : 'Data masukan tidak valid';

        return next(
          new AppError(400, 'VALIDATION_ERROR', errorMessage, error.format())
        );
      }
      return next(error);
    }
  };
};
