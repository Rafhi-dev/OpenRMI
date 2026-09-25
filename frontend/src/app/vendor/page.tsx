'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { PortfolioSummary } from '@/components/vendor/PortfolioSummary';
import { TenantManagement } from '@/components/vendor/TenantManagement';
import { ConsultantManagement } from '@/components/vendor/ConsultantManagement';
import { AssignmentManagement } from '@/components/vendor/AssignmentManagement';
import { Building2, LogOut, Briefcase, Users, FileCheck, LayoutDashboard } from 'lucide-react';

type VendorTab = 'portfolio' | 'tenants' | 'consultants' | 'assignments';

export default function VendorDashboardPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<VendorTab>('portfolio');

  const navItems = [
    { id: 'portfolio' as VendorTab, label: 'Progres Portofolio', icon: LayoutDashboard },
    { id: 'tenants' as VendorTab, label: 'Perusahaan Klien', icon: Briefcase },
    { id: 'consultants' as VendorTab, label: 'Tim Asesor', icon: Users },
    { id: 'assignments' as VendorTab, label: 'Penugasan Proyek', icon: FileCheck },
  ];

  return (
    <ProtectedRoute allowedRoles={['VENDOR']}>
      <div className="min-h-screen bg-surface-bg flex flex-col">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border-subtle bg-white px-6 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-primary-900 leading-tight">
                Vendor Portal Asesmen
              </h1>
              <p className="text-xs text-slate-500">
                {user?.vendor?.name || 'Lembaga Asesmen Risiko Terdaftar'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-xs font-bold text-primary-900">{user?.fullName}</p>
              <p className="text-[11px] text-amber-600 font-semibold">{user?.role}</p>
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
                      ? 'border-amber-600 text-amber-700'
                      : 'border-transparent text-slate-600 hover:text-primary-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'portfolio' && <PortfolioSummary />}
          {activeTab === 'tenants' && <TenantManagement />}
          {activeTab === 'consultants' && <ConsultantManagement />}
          {activeTab === 'assignments' && <AssignmentManagement />}
        </main>
      </div>
    </ProtectedRoute>
  );
}
