import jwt, { SignOptions } from 'jsonwebtoken';
import { Response } from 'express';
import { JwtUserPayload, AuthTokens } from './auth.types';

const JWT_SECRET = process.env.JWT_SECRET || 'openrmi_super_secret_jwt_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${JWT_SECRET}_refresh`;

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const IMPERSONATION_TOKEN_EXPIRY = '2h';

export const signAccessToken = (payload: JwtUserPayload, isImpersonation = false): string => {
  const options: SignOptions = {
    expiresIn: isImpersonation ? IMPERSONATION_TOKEN_EXPIRY : ACCESS_TOKEN_EXPIRY,
  };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const signRefreshToken = (payload: JwtUserPayload): string => {
  const options: SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  };
  return jwt.sign(payload, JWT_REFRESH_SECRET, options);
};

export const generateAuthTokens = (payload: JwtUserPayload, isImpersonation = false): AuthTokens => {
  return {
    accessToken: signAccessToken(payload, isImpersonation),
    refreshToken: signRefreshToken(payload),
  };
};

export const verifyAccessToken = (token: string): JwtUserPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtUserPayload;
};

export const verifyRefreshToken = (token: string): JwtUserPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JwtUserPayload;
};

export const setAuthCookies = (res: Response, tokens: AuthTokens, isImpersonation = false): void => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Access Token Cookie (15 min, or 2h if impersonation)
  res.cookie('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: isImpersonation ? 2 * 60 * 60 * 1000 : 15 * 60 * 1000,
    path: '/',
  });

  // Refresh Token Cookie (7 days)
  res.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

export const clearAuthCookies = (res: Response): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  });
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  });
};
