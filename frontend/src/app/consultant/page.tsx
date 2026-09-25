'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileCheck2, LogOut, Sparkles, BookOpen } from 'lucide-react';

export default function ConsultantDashboardPage() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute allowedRoles={['EXTERNAL_CONSULTANT']}>
      <div className="min-h-screen bg-surface-bg flex flex-col">
        <header className="h-16 border-b border-border-subtle bg-white px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-brand-blue-50 text-brand-blue-600 rounded-lg">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-primary-900 leading-tight">
                Workspace Asesor & Penilaian 42 Parameter
              </h1>
              <p className="text-xs text-slate-500">
                {user?.agencyName || 'Konsultan Eksternal Independen'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-xs font-bold text-primary-900">{user?.fullName}</p>
              <p className="text-[11px] text-brand-blue-600 font-semibold">{user?.role}</p>
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
                  Reviu Dokumen Split-Screen
                </CardTitle>
                <BookOpen className="h-4 w-4 text-brand-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-primary-900">42 Parameter RMI</div>
                <p className="text-xs text-slate-500 mt-1">Evaluasi kriteria & screenshot bukti Kolom L</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
                  DeepSeek AI Assistance
                </CardTitle>
                <Sparkles className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-primary-900">AI Help & One-Click Apply</div>
                <p className="text-xs text-slate-500 mt-1">RAG semantic search & penalaran cerdas</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
