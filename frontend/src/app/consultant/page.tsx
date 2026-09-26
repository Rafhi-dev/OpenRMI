'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { ParameterMatrixWorkspace } from '@/components/consultant/ParameterMatrixWorkspace';
import { PerformanceCalculationSheet } from '@/components/consultant/PerformanceCalculationSheet';
import { PriorityMatrixWorkspace } from '@/components/consultant/PriorityMatrixWorkspace';
import { PostFgdAiModal } from '@/components/consultant/PostFgdAiModal';
import { OfficialReportsTab } from '@/components/consultant/OfficialReportsTab';
import { HistoricalBaselineTab } from '@/components/counterpart/HistoricalBaselineTab';
import {
  FileCheck2,
  LogOut,
  Sparkles,
  Scale,
  Grid,
  FileSpreadsheet,
  BrainCircuit,
  Building2,
  Calendar,
  Lock,
  Unlock,
  AlertCircle,
  Briefcase,
  TrendingUp,
} from 'lucide-react';

type ConsultantTab = 'evaluation' | 'performance' | 'recommendations' | 'post-fgd-ai' | 'historical' | 'reports';

interface AssignmentOption {
  id: string;
  tenantId: string;
  periodId: string;
  tenant: {
    id: string;
    name: string;
    code: string;
    industryCluster: string;
  };
  period: {
    id: string;
    year: number;
    status: string;
    modelCluster: string;
    isLocked: boolean;
    aspectDimScore?: number;
    perfScore?: number;
    finalRmiScore?: number;
  };
}

export default function ConsultantDashboardPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ConsultantTab>('evaluation');
  const [assignments, setAssignments] = useState<AssignmentOption[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  const fetchAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await api.get('/consultant/assignments');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setAssignments(res.data.data);
        if (res.data.data.length > 0 && !selectedPeriodId) {
          setSelectedPeriodId(res.data.data[0].period.id);
        }
      }
    } catch (err) {
      console.warn('Could not load consultant assignments:', err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const selectedAssignment =
    assignments.find((a) => a.period.id === selectedPeriodId) || assignments[0];

  const navItems = [
    { id: 'evaluation' as ConsultantTab, label: 'Workspace Evaluasi Split-Screen', icon: FileCheck2 },
    { id: 'performance' as ConsultantTab, label: 'Kalkulasi Aspek Kinerja & Gating', icon: Scale },
    { id: 'recommendations' as ConsultantTab, label: 'Matriks Prioritas 2x2', icon: Grid },
    { id: 'post-fgd-ai' as ConsultantTab, label: 'Analisis AI Dokumen Pasca-FGD', icon: BrainCircuit },
    { id: 'historical' as ConsultantTab, label: 'Baseline YoY & Survei Budaya', icon: TrendingUp },
    { id: 'reports' as ConsultantTab, label: 'Pusat Unduh Laporan Resmi & Excel', icon: FileSpreadsheet },
  ];

  return (
    <ProtectedRoute allowedRoles={['EXTERNAL_CONSULTANT', 'ADMINISTRATOR']}>
      <div className="min-h-screen bg-surface-bg flex flex-col">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border-subtle bg-white px-6 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand-blue-50 text-brand-blue-600 rounded-lg">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-primary-900 leading-tight">
                Workspace Asesor & Penilaian 42 Parameter KBUMN
              </h1>
              <p className="text-xs text-slate-500">
                {user?.agencyName || 'Lembaga Asesmen Risiko Independen'}
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

        {/* Client Company & Period Selector Bar */}
        <div className="bg-slate-900 text-white px-6 py-3 border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2 text-xs">
                <Building2 className="h-4 w-4 text-brand-blue-400" />
                <span className="text-slate-300 font-medium">Perusahaan Klien Penugasan:</span>
              </div>

              {assignments.length > 0 ? (
                <div className="relative">
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    className="bg-slate-800 text-white text-xs font-bold rounded-lg px-3 py-1.5 border border-slate-700 pr-8 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 cursor-pointer"
                  >
                    {assignments.map((a) => (
                      <option key={a.id} value={a.period?.id}>
                        {a.tenant?.name || 'Klien'} &bull; Tahun {a.period?.year || '-'} ({a.period?.status ? a.period.status.replace(/_/g, ' ') : 'ACTIVE'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-xs text-slate-400 font-medium italic">
                  Belum ada penugasan aktif dari Vendor
                </span>
              )}

              {selectedAssignment?.period && (
                <div className="flex items-center space-x-2">
                  <Badge variant="primary" className="text-[10px]">
                    Klaster {selectedAssignment.period.modelCluster || 'UMUM'}
                  </Badge>

                  <span className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {selectedAssignment.period.isLocked ? (
                      <>
                        <Lock className="h-3 w-3 text-amber-400" />
                        <span>Terkunci Permanen (Finalized)</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3 w-3 text-emerald-400" />
                        <span>Penilaian Terbuka (Active)</span>
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>

            {selectedAssignment?.period?.finalRmiScore && (
              <div className="text-xs text-slate-300 flex items-center space-x-2">
                <span>Skor RMI Terhitung:</span>
                <span className="font-extrabold text-white bg-brand-blue-600 px-2.5 py-0.5 rounded">
                  {Number(selectedAssignment.period.finalRmiScore).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-border-subtle px-6 sticky top-16 z-20 shadow-xs">
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
                      ? 'border-brand-blue-600 text-brand-blue-700'
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

        {/* Main Content Area */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {loadingAssignments ? (
            <div className="py-20 text-center text-xs text-slate-400">
              Memverifikasi surat penugasan konsultan...
            </div>
          ) : !selectedPeriodId ? (
            <div className="bg-white rounded-xl border border-border-subtle p-12 text-center space-y-3">
              <Briefcase className="h-10 w-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-primary-900">Belum Ada Penugasan Aktif</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Akun konsultan Anda belum memiliki penugasan aktif (Consultant Assignment) dari Vendor ke
                perusahaan BUMN klien. Silakan hubungi admin Vendor untuk penerbitan penugasan.
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'evaluation' && (
                <ParameterMatrixWorkspace
                  periodId={selectedPeriodId}
                  isLocked={selectedAssignment?.period?.isLocked}
                />
              )}

              {activeTab === 'performance' && (
                <PerformanceCalculationSheet
                  periodId={selectedPeriodId}
                  isLocked={selectedAssignment?.period?.isLocked}
                />
              )}

              {activeTab === 'recommendations' && (
                <PriorityMatrixWorkspace
                  periodId={selectedPeriodId}
                  isLocked={selectedAssignment?.period?.isLocked}
                />
              )}

              {activeTab === 'post-fgd-ai' && (
                <PostFgdAiModal
                  periodId={selectedPeriodId}
                  isLocked={selectedAssignment?.period?.isLocked}
                />
              )}

              {activeTab === 'historical' && (
                <HistoricalBaselineTab
                  periodId={selectedPeriodId}
                  isLocked={selectedAssignment?.period?.isLocked}
                />
              )}

              {activeTab === 'reports' && (
                <OfficialReportsTab
                  periodId={selectedPeriodId}
                  isLocked={selectedAssignment?.period?.isLocked}
                />
              )}
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
