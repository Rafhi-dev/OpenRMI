'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/auth';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else {
        const redirectMap: Record<UserRole, string> = {
          ADMINISTRATOR: '/admin',
          VENDOR: '/vendor',
          EXTERNAL_CONSULTANT: '/consultant',
          COUNTERPART_TEAM: '/counterpart',
        };
        router.push(redirectMap[user.role] || '/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-blue-500 border-t-transparent" />
        <p className="text-sm text-slate-300 font-medium">Mengarahkan ke Workspace OpenRMI...</p>
      </div>
    </div>
  );
}
