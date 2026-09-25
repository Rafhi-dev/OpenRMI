'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Landmark, LogOut, UploadCloud, Eye } from 'lucide-react';

export default function CounterpartDashboardPage() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute allowedRoles={['COUNTERPART_TEAM']}>
      <div className="min-h-screen bg-surface-bg flex flex-col">
        <header className="h-16 border-b border-border-subtle bg-white px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-primary-900 leading-tight">
                Portal Perusahaan BUMN (Counterpart)
              </h1>
              <p className="text-xs text-slate-500">
                {user?.tenant?.name || 'Perusahaan Klien'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-xs font-bold text-primary-900">{user?.fullName}</p>
              <p className="text-[11px] text-emerald-600 font-semibold">{user?.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-1 text-slate-500" />
              Keluar
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
                  Unggah Dokumen Bukti & Pasca-FGD
                </CardTitle>
                <UploadCloud className="h-4 w-4 text-brand-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-primary-900">Checklist & Eviden</div>
                <p className="text-xs text-slate-500 mt-1">Upload berkas PDF, DOCX, XLSX terenkripsi</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
                  Live Monitoring Asesor
                </CardTitle>
                <Eye className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-primary-900">Pemantauan Real-time</div>
                <p className="text-xs text-slate-500 mt-1">Pantau progres reviu & celah temuan draf</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
