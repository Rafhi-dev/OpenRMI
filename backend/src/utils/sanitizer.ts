import { Request, Response, NextFunction } from 'express';

/**
 * Membersihkan string dari karakter berbahaya (Anti-XSS, Null Byte injection, dan whitespace liar)
 */
export function sanitizeString(val: string): string {
  if (typeof val !== 'string') return val;

  return val
    .replace(/\0/g, '') // Hapus Null byte
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Hapus blok script HTML
    .replace(/javascript:/gi, '') // Hapus skema URL javascript:
    .replace(/onerror\s*=/gi, '') // Hapus inline handler
    .replace(/onload\s*=/gi, '')
    .trim();
}

/**
 * Sanitasi rekursif untuk seluruh objek, array, atau nilai primitif
 */
export function sanitizeData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeString(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item)) as unknown as T;
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Hapus prefix operator berbahaya seperti MongoDB $ operators bila ada
      const sanitizedKey = key.replace(/^\$/, '');
      sanitizedObj[sanitizedKey] = sanitizeData(value);
    }
    return sanitizedObj as T;
  }

  return data;
}

/**
 * Middleware Express untuk otomatis membersihkan req.body, req.query, dan req.params
 */
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeData(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeData(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeData(req.params);
  }

  next();
};
