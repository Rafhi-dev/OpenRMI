'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-bg">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Memverifikasi sesi OpenRMI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-bg p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm border border-border-subtle text-center space-y-4">
          <div className="h-12 w-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-primary-900">Akses Tidak Diizinkan (403)</h2>
          <p className="text-sm text-slate-600">
            Peran Anda ({user.role}) tidak memiliki hak akses untuk membuka halaman ini.
          </p>
          <button
            onClick={() => router.back()}
            className="text-sm font-semibold text-brand-blue-600 hover:underline"
          >
            &larr; Kembali ke halaman sebelumnya
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
