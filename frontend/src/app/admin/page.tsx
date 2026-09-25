'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShieldCheck, LogOut, Cpu, Users, Activity, FileSpreadsheet } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
      <div className="min-h-screen bg-surface-bg flex flex-col">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border-subtle bg-white px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-brand-blue-50 text-brand-blue-600 rounded-lg">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-primary-900 leading-tight">
                Administrator Platform Console
              </h1>
              <p className="text-xs text-slate-500">Root Governance & Sistem Monitoring OpenRMI</p>
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

        {/* Content Body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
                  Kesehatan Sistem
                </CardTitle>
                <Activity className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-emerald-600">OPERATIONAL</div>
                <p className="text-xs text-slate-500 mt-1">PostgreSQL & Redis Connected</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
                  Model DeepSeek AI
                </CardTitle>
                <Cpu className="h-4 w-4 text-brand-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-primary-900">DeepSeek Flash / Pro</div>
                <p className="text-xs text-slate-500 mt-1">Thinking Mode Enabled</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
                  Regulasi KBUMN
                </CardTitle>
                <FileSpreadsheet className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-primary-900">PER-2/MBU/03/2023</div>
                <p className="text-xs text-slate-500 mt-1">42 Parameter Industri Umum</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
                  Isolasi Multi-Tenant
                </CardTitle>
                <Users className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-primary-900">RLS Active</div>
                <p className="text-xs text-slate-500 mt-1">PostgreSQL 18 Row-Level Security</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pusat Kontrol Administrator</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 leading-relaxed">
                Selamat datang di konsol Administrator OpenRMI. Dari panel ini Anda dapat mengelola
                akun Vendor lembaga asesmen, menjalankan pengujian kesehatan sistem, mengonfigurasi API Keys
                DeepSeek LLM dan Jina Embeddings, serta memulai sesi Impersonasi Vendor.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
}
