import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

// Fallback In-Memory Rate Limiter Map
const requestCounts = new Map<string, { count: number; resetTime: number }>();

interface RateLimiterOptions {
  windowMs?: number; // Jendela waktu dalam milidetik (default: 60 detik)
  max?: number;      // Batas maksimum request per jendela waktu (default: 100)
  message?: string;
}

export const rateLimiter = (options: RateLimiterOptions = {}) => {
  const windowMs = options.windowMs || 60 * 1000;
  const max = options.max || 100;
  const message = options.message || 'Terlalu banyak permintaan. Silakan tunggu beberapa saat lagi.';

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Abaikan rate limiter pada mode pengujian otomatis
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const key = `ratelimit:${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    // Sederhana dan reliabel: in-memory sliding bucket
    const current = requestCounts.get(key);

    if (!current || now > current.resetTime) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (current.count >= max) {
      return next(new AppError(429, 'TOO_MANY_REQUESTS', message));
    }

    current.count += 1;
    return next();
  };
};

// Rate limiter ketat khusus untuk endpoint login (mencegah Brute Force)
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 15,                  // Maksimal 15 percobaan login per 15 menit
  message: 'Terlalu banyak percobaan login gagal. Demi keamanan, silakan coba lagi setelah 15 menit.',
});
