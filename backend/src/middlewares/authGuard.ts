import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { verifyAccessToken } from '../modules/auth/auth.jwt';

export const authGuard = (req: Request, _res: Response, next: NextFunction): void => {
  // 1. Baca token dari httpOnly cookie (rekomendasi keamanan)
  let token = req.cookies?.access_token;

  // 2. Fallback: baca dari Authorization Bearer header
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan. Silakan login terlebih dahulu.'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Sesi akses Anda telah kedaluwarsa. Silakan refresh token atau login kembali.'));
    }
    return next(new AppError(401, 'INVALID_TOKEN', 'Token autentikasi tidak valid.'));
  }
};
