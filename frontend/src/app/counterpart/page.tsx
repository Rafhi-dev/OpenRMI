'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { EvidenceChecklistWorkspace } from '@/components/counterpart/EvidenceChecklistWorkspace';
import { SupplementaryDocsTab } from '@/components/counterpart/SupplementaryDocsTab';
import { LiveMonitoringTab } from '@/components/counterpart/LiveMonitoringTab';
import { RecommendationFollowUpTab } from '@/components/counterpart/RecommendationFollowUpTab';
import { HistoricalBaselineTab } from '@/components/counterpart/HistoricalBaselineTab';
import {
  Landmark,
  LogOut,
  FileCheck,
  UploadCloud,
  Activity,
  ClipboardList,
  Calendar,
  Lock,
  Unlock,
  BarChart3,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

type CounterpartTab = 'checklist' | 'supplementary' | 'monitoring' | 'historical' | 'follow-ups';

interface AssessmentPeriodOption {
  id: string;
  year: number;
  status: string;
  modelCluster: string;
  isLocked: boolean;
  assignments?: Array<{
    consultant: {
      fullName: string;
      agencyName: string;
    };
  }>;
}

export default function CounterpartDashboardPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<CounterpartTab>('checklist');
  const [periods, setPeriods] = useState<AssessmentPeriodOption[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [loadingPeriods, setLoadingPeriods] = useState(true);

  const fetchPeriods = async () => {
    setLoadingPeriods(true);
    try {
      const res = await api.get('/counterpart/periods');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setPeriods(res.data.data);
        if (res.data.data.length > 0 && !selectedPeriodId) {
          setSelectedPeriodId(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.warn('Could not load periods:', err);
    } finally {
      setLoadingPeriods(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId) || periods[0];

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'FINALIZED':
        return <Badge variant="success">Final & Terkunci</Badge>;
      case 'DRAFT_CONFIRMATION':
        return <Badge variant="warning">Konfirmasi Draf</Badge>;
      case 'SCORING_STAGE':
        return <Badge variant="primary">Kalkulasi Skor</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="primary">Reviu Asesor</Badge>;
      case 'EVIDENCE_GATHERING':
      default:
        return <Badge variant="outline">Pengunggahan Bukti</Badge>;
    }
  };

  const navItems = [
    { id: 'checklist' as CounterpartTab, label: 'Checklist Eviden 42 Parameter', icon: FileCheck },
    { id: 'supplementary' as CounterpartTab, label: 'Dokumen Pasca-FGD', icon: UploadCloud },
    { id: 'monitoring' as CounterpartTab, label: 'Live Monitoring & Konfirmasi', icon: Activity },
    { id: 'historical' as CounterpartTab, label: 'Baseline & Komparasi YoY', icon: BarChart3 },
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
                Portal Tim Counterpart BUMN
              </h1>
              <p className="text-xs text-slate-500">
                {user?.tenant?.name || 'Entitas Korporasi BUMN'} {user?.tenant?.code ? `(${user.tenant.code})` : ''}
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

        {/* Assessment Period Control Bar */}
        <div className="bg-slate-900 text-white px-6 py-3 border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2 text-xs">
                <Calendar className="h-4 w-4 text-emerald-400" />
                <span className="text-slate-300">Tahun Buku Asesmen:</span>
              </div>

              {periods.length > 0 ? (
                <div className="relative">
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    className="bg-slate-800 text-white text-xs font-bold rounded-lg px-3 py-1.5 border border-slate-700 pr-8 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        Tahun Buku {p.year} ({p.status ? p.status.replace(/_/g, ' ') : 'ACTIVE'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-xs text-slate-400 font-semibold">Tahun Berjalan 2024</span>
              )}

              {selectedPeriod && (
                <div className="flex items-center space-x-2">
                  {getStatusBadge(selectedPeriod.status)}
                  <span className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {selectedPeriod.isLocked ? (
                      <>
                        <Lock className="h-3 w-3 text-amber-400" />
                        <span>Terkunci Permanen</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3 w-3 text-emerald-400" />
                        <span>Terbuka (Input Aktif)</span>
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>

            {selectedPeriod?.assignments?.[0]?.consultant && (
              <div className="text-xs text-slate-400 flex items-center space-x-2">
                <span>Lead Asesor:</span>
                <span className="font-bold text-white">
                  {selectedPeriod.assignments[0].consultant.fullName}
                </span>
                <span className="text-slate-500">&bull;</span>
                <span className="text-emerald-400 font-medium">
                  {selectedPeriod.assignments[0].consultant.agencyName}
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
          {activeTab === 'checklist' && (
            <EvidenceChecklistWorkspace
              periodId={selectedPeriod?.id}
              isLocked={selectedPeriod?.isLocked}
            />
          )}

          {activeTab === 'supplementary' && (
            <SupplementaryDocsTab
              periodId={selectedPeriod?.id}
              isLocked={selectedPeriod?.isLocked}
            />
          )}

          {activeTab === 'monitoring' && (
            <LiveMonitoringTab
              periodId={selectedPeriod?.id}
              onStatusChange={fetchPeriods}
            />
          )}

          {activeTab === 'historical' && (
            <HistoricalBaselineTab
              periodId={selectedPeriod?.id}
              isLocked={selectedPeriod?.isLocked}
            />
          )}

          {activeTab === 'follow-ups' && (
            <RecommendationFollowUpTab
              periodId={selectedPeriod?.id}
              isLocked={selectedPeriod?.isLocked}
            />
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
