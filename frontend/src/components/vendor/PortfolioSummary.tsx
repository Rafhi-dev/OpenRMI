'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Briefcase, Users, FileCheck, CheckCircle2, Clock } from 'lucide-react';

interface PortfolioData {
  macroSummary: {
    totalTenants: number;
    totalConsultants: number;
    totalActiveAssignments: number;
  };
  tenantsProgress: Array<{
    tenantId: string;
    tenantName: string;
    tenantCode: string;
    industryCluster: string;
    currentPeriod: {
      id: string;
      year: number;
      status: string;
      finalRmiScore: number | null;
      maturityPhase: string | null;
    } | null;
    leadConsultant: string | null;
  }>;
}

export function PortfolioSummary() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await api.get('/vendor/portfolio-progress');
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Gagal memuat ringkasan portofolio.');
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Memuat progres portofolio...</div>;
  }

  if (error) {
    return <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-md">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-primary-900">Dashboard Portofolio Asesmen</h2>
        <p className="text-xs text-slate-500">
          Ringkasan makro seluruh perusahaan klien dan status pengerjaan asesmen konsultan
        </p>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
                  Perusahaan Klien Terdaftar
                </CardTitle>
                <Briefcase className="h-4 w-4 text-brand-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary-900">
                  {data.macroSummary.totalTenants}
                </div>
                <p className="text-xs text-slate-500 mt-1">Tenant di bawah portofolio vendor</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
                  Tim Konsultan Asesor
                </CardTitle>
                <Users className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary-900">
                  {data.macroSummary.totalConsultants}
                </div>
                <p className="text-xs text-slate-500 mt-1">Asesor tersertifikasi aktif</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
                  Penugasan Berjalan (Active)
                </CardTitle>
                <FileCheck className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary-900">
                  {data.macroSummary.totalActiveAssignments}
                </div>
                <p className="text-xs text-slate-500 mt-1">Proyek asesmen dengan e-NDA aktif</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabel Progres Makro Klien */}
          <div className="bg-white rounded-lg border border-border-subtle shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle">
              <h3 className="text-sm font-bold text-primary-900">Status Progres Klien Asesmen</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-primary-900">
                <thead className="bg-surface-bg border-b border-border-subtle text-xs uppercase font-semibold text-slate-600">
                  <tr>
                    <th className="px-6 py-3.5">Perusahaan Klien</th>
                    <th className="px-6 py-3.5">Klaster</th>
                    <th className="px-6 py-3.5">Tahun Buku</th>
                    <th className="px-6 py-3.5">Tahapan Asesmen</th>
                    <th className="px-6 py-3.5">Lead Assessor</th>
                    <th className="px-6 py-3.5 text-right">Skor RMI Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.tenantsProgress.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-xs">
                        Belum ada data klien terdaftar.
                      </td>
                    </tr>
                  ) : (
                    data.tenantsProgress.map((tp) => (
                      <tr key={tp.tenantId} className="hover:bg-surface-bg/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-primary-900">
                          {tp.tenantName}
                          <span className="block text-[11px] font-mono text-slate-400 font-normal">
                            {tp.tenantCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">{tp.industryCluster}</td>
                        <td className="px-6 py-4 text-xs font-semibold">
                          {tp.currentPeriod ? tp.currentPeriod.year : '-'}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {tp.currentPeriod?.status === 'FINALIZED' ? (
                            <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[11px]">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> FINALIZED
                            </span>
                          ) : tp.currentPeriod ? (
                            <span className="inline-flex items-center text-brand-blue-700 bg-brand-blue-50 px-2 py-0.5 rounded font-semibold text-[11px]">
                              <Clock className="h-3 w-3 mr-1" /> {tp.currentPeriod.status}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Belum Dimulai</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          {tp.leadConsultant || '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {tp.currentPeriod?.finalRmiScore ? (
                            <div>
                              <span className="font-bold text-sm text-brand-blue-600">
                                {tp.currentPeriod.finalRmiScore.toFixed(2)}
                              </span>
                              <span className="block text-[10px] text-slate-400 font-medium">
                                {tp.currentPeriod.maturityPhase}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
