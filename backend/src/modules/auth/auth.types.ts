import { UserRole } from '@prisma/client';

export interface JwtUserPayload {
  userId: string;
  role: UserRole;
  email: string;
  username: string | null;
  vendorId: string | null;
  tenantId: string | null;
  impersonatedByAdminId?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponseData {
  user: {
    id: string;
    role: UserRole;
    email: string;
    username: string | null;
    fullName: string;
    vendorId: string | null;
    tenantId: string | null;
    impersonatedByAdminId?: string | null;
  };
  accessToken?: string; // Optional if client also wants raw token header fallback
}
