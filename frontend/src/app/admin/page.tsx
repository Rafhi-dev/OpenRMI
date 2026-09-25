'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { SystemHealthCard } from '@/components/admin/SystemHealthCard';
import { VendorManagementTable } from '@/components/admin/VendorManagementTable';
import { AiConfigForm } from '@/components/admin/AiConfigForm';
import { UploadSettingsForm } from '@/components/admin/UploadSettingsForm';
import { MasterModelsViewer } from '@/components/admin/MasterModelsViewer';
import {
  ShieldCheck,
  LogOut,
  Activity,
  Building2,
  Cpu,
  HardDrive,
  FileSpreadsheet,
} from 'lucide-react';

type AdminTab = 'health' | 'vendors' | 'ai-config' | 'settings' | 'models';

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('health');

  const navItems = [
    { id: 'health' as AdminTab, label: 'Kesehatan Sistem', icon: Activity },
    { id: 'vendors' as AdminTab, label: 'Lembaga Vendor', icon: Building2 },
    { id: 'ai-config' as AdminTab, label: 'Pengaturan AI Global', icon: Cpu },
    { id: 'settings' as AdminTab, label: 'Kebijakan Berkas', icon: HardDrive },
    { id: 'models' as AdminTab, label: 'Master Regulasi KBUMN', icon: FileSpreadsheet },
  ];

  return (
    <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
      <div className="min-h-screen bg-surface-bg flex flex-col">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border-subtle bg-white px-6 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand-blue-50 text-brand-blue-600 rounded-lg">
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

        {/* Tab Navigation Bar */}
        <div className="bg-white border-b border-border-subtle px-6">
          <div className="max-w-7xl mx-auto flex space-x-1 sm:space-x-4 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 py-3.5 px-3 border-b-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-brand-blue-600 text-brand-blue-600'
                      : 'border-transparent text-slate-600 hover:text-primary-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-brand-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'health' && <SystemHealthCard />}
          {activeTab === 'vendors' && <VendorManagementTable />}
          {activeTab === 'ai-config' && <AiConfigForm />}
          {activeTab === 'settings' && <UploadSettingsForm />}
          {activeTab === 'models' && <MasterModelsViewer />}
        </main>
      </div>
    </ProtectedRoute>
  );
}
