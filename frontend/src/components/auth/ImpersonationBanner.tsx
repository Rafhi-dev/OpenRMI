'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut } from 'lucide-react';

export function ImpersonationBanner() {
  const { user, exitImpersonate } = useAuth();

  if (!user?.isImpersonating && !user?.impersonatedByAdminId) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white shadow-md border-b border-amber-700 animate-pulse-slow">
      <div className="flex items-center space-x-3">
        <div className="p-1 bg-amber-700 rounded-full">
          <AlertTriangle className="h-4 w-4 text-amber-100" />
        </div>
        <div className="text-xs sm:text-sm font-semibold tracking-wide">
          <span className="uppercase font-bold bg-amber-800 px-2 py-0.5 rounded text-[11px] mr-2">
            Mode Impersonasi Aktif
          </span>
          Anda sedang mengoperasikan sistem sebagai Vendor:{' '}
          <span className="font-bold underline decoration-amber-200">
            {user.vendor?.name || user.fullName}
          </span>
          <span className="hidden md:inline ml-2 text-amber-100 text-xs font-normal">
            (Seluruh mutasi data dicatat pada audit log Administrator)
          </span>
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={exitImpersonate}
        className="bg-white text-amber-900 hover:bg-amber-50 font-bold border-none shadow text-xs py-1 h-7"
      >
        <LogOut className="h-3.5 w-3.5 mr-1 text-amber-700" />
        Akhiri Sesi Impersonasi
      </Button>
    </div>
  );
}
