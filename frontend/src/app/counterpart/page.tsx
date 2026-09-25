'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { EvidenceChecklistWorkspace } from '@/components/counterpart/EvidenceChecklistWorkspace';
import { SupplementaryDocsTab } from '@/components/counterpart/SupplementaryDocsTab';
import { LiveMonitoringTab } from '@/components/counterpart/LiveMonitoringTab';
import { RecommendationFollowUpTab } from '@/components/counterpart/RecommendationFollowUpTab';
import {
  Landmark,
  LogOut,
  FileCheck,
  UploadCloud,
  Activity,
  ClipboardList,
} from 'lucide-react';

type CounterpartTab = 'checklist' | 'supplementary' | 'monitoring' | 'follow-ups';

export default function CounterpartDashboardPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<CounterpartTab>('checklist');

  const navItems = [
    { id: 'checklist' as CounterpartTab, label: 'Checklist Eviden', icon: FileCheck },
    { id: 'supplementary' as CounterpartTab, label: 'Dokumen Pasca-FGD', icon: UploadCloud },
    { id: 'monitoring' as CounterpartTab, label: 'Live Monitoring & Konfirmasi', icon: Activity },
    { id: 'follow-ups' as CounterpartTab, label: 'Tindak Lanjut Triwulan', icon: ClipboardList },
  ];

  return (
    <ProtectedRoute allowedRoles={['COUNTERPART_TEAM']}>
      <div className="min-h-screen bg-surface-bg flex flex-col">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border-subtle bg-white px-6 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-primary-900 leading-tight">
                Portal Perusahaan BUMN (Counterpart)
              </h1>
              <p className="text-xs text-slate-500">
                {user?.tenant?.name || 'Entitas Korporasi Terdaftar'}
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

        {/* Tab Navigation */}
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
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-600 hover:text-primary-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'checklist' && <EvidenceChecklistWorkspace />}
          {activeTab === 'supplementary' && <SupplementaryDocsTab />}
          {activeTab === 'monitoring' && <LiveMonitoringTab />}
          {activeTab === 'follow-ups' && <RecommendationFollowUpTab />}
        </main>
      </div>
    </ProtectedRoute>
  );
}
