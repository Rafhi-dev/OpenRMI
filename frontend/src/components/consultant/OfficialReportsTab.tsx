'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  Award,
  Lock,
} from 'lucide-react';

interface FullReportData {
  period: {
    id: string;
    year: number;
    status: string;
    modelCluster: string;
    isLocked: boolean;
    aspectDimScore?: number;
    perfScore?: number;
    finalRmiScore?: number;
    maturityPhase?: string;
  };
  tenant: {
    id: string;
    name: string;
    code: string;
    industryCluster: string;
  };
  dimensions: Array<{
    id: number;
    code: string;
    name: string;
    score: number | null;
    parametersCount: number;
  }>;
  signatories?: {
    approvedAt?: string;
    signatoryName?: string;
    signatoryTitle?: string;
  };
}

interface OfficialReportsTabProps {
  periodId: string;
  isLocked?: boolean;
}

export function OfficialReportsTab({ periodId }: OfficialReportsTabProps) {
  const [data, setData] = useState<FullReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/reports/${periodId}/full-report`);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat ringkasan laporan resmi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [periodId]);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const response = await api.get(`/reports/${periodId}/summary-pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Laporan_RMI_Format_1.2.8_${data?.tenant?.code || 'BUMN'}_${data?.period?.year || 2024}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal mengunduh dokumen PDF Formulir 1.2.8.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const response = await api.get(`/reports/${periodId}/export-excel`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `SCORE_RMI_${data?.tenant?.code || 'BUMN'}_${data?.period?.year || 2024}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal mengekspor lembar kerja Excel SCORE RMI.');
    } finally {
      setDownloadingExcel(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Menyiapkan laporan resmi KBUMN...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
        {error || 'Data laporan tidak ditemukan.'}
      </div>
    );
  }

  const finalScore = data.period.finalRmiScore ?? data.period.aspectDimScore ?? 0;
  const isFinalized = data.period.isLocked || data.period.status === 'FINALIZED';

  return (
    <div className="space-y-6">
      {/* Official Download Center Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-blue-950 to-slate-900 text-white rounded-2xl p-8 border border-slate-800 shadow-lg space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Badge variant="primary" className="bg-brand-blue-500/30 text-brand-blue-200 border-brand-blue-400">
                Pusat Pelaporan Resmi KBUMN
              </Badge>
              {isFinalized && (
                <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-700">
                  <Lock className="h-3 w-3" />
                  <span>Final & Disahkan</span>
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-white">
              {data.tenant.name} &bull; Tahun Buku {data.period.year}
            </h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Seluruh hasil penilaian 42 parameter, evaluasi kinerja, klausul gating, dan matriks rekomendasi
              dapat diunduh secara resmi dalam format PDF standar Formulir 1.2.8 dan lembar kerja Excel sinkron.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="lg"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold"
            >
              <FileText className="h-4 w-4 mr-2 text-rose-400" />
              {downloadingPdf ? 'Mengunduh PDF...' : 'Unduh PDF Format 1.2.8'}
            </Button>

            <Button
              variant="primary"
              size="lg"
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-200" />
              {downloadingExcel ? 'Mengekspor Excel...' : 'Ekspor Excel SCORE RMI.xlsx'}
            </Button>
          </div>
        </div>

        {/* Macro Score Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Skor Aspek Dimensi</span>
            <span className="text-2xl font-extrabold text-white">
              {data.period.aspectDimScore !== undefined && data.period.aspectDimScore !== null
                ? Number(data.period.aspectDimScore).toFixed(2)
                : '-'}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Skor Aspek Kinerja</span>
            <span className="text-2xl font-extrabold text-white">
              {data.period.perfScore !== undefined && data.period.perfScore !== null
                ? Number(data.period.perfScore).toFixed(1)
                : '-'}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Skor Akhir RMI</span>
            <span className="text-2xl font-extrabold text-emerald-400">
              {Number(finalScore).toFixed(2)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Fase Kematangan</span>
            <span className="text-xs font-bold text-white mt-1 block truncate">
              {data.period.maturityPhase || 'Fase Berkembang'}
            </span>
          </div>
        </div>
      </div>

      {/* 5 Dimensions Breakdown Table */}
      <div className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden p-6 space-y-4">
        <h4 className="text-sm font-bold text-primary-900">
          Ringkasan Capaian Skor Per Dimensi (Lembar Kerja Standar KBUMN)
        </h4>

        <div className="divide-y divide-border-subtle border border-border-subtle rounded-xl overflow-hidden text-xs">
          {data.dimensions.map((dim) => (
            <div key={dim.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-brand-blue-700 bg-brand-blue-50 px-2 py-0.5 rounded border border-brand-blue-200">
                    {dim.code}
                  </span>
                  <span className="font-bold text-primary-900">{dim.name}</span>
                </div>
                <p className="text-[11px] text-slate-500">{dim.parametersCount} Parameter Penilaian</p>
              </div>

              <div className="text-right">
                <span className="text-base font-extrabold text-primary-900">
                  {dim.score !== null ? dim.score.toFixed(2) : '-'}
                </span>
                <span className="text-[11px] text-slate-400 block">/ 5.00</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
