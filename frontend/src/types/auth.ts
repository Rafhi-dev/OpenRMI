export type UserRole =
  | 'ADMINISTRATOR'
  | 'VENDOR'
  | 'EXTERNAL_CONSULTANT'
  | 'COUNTERPART_TEAM';

export interface User {
  id: string;
  fullName: string;
  username: string | null;
  email: string;
  role: UserRole;
  vendorId: string | null;
  tenantId: string | null;
  agencyName?: string | null;
  isImpersonating?: boolean;
  impersonatedByAdminId?: string | null;
  vendor?: {
    id: string;
    name: string;
    code: string;
  } | null;
  tenant?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data: {
    user: User;
    impersonating?: boolean;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
