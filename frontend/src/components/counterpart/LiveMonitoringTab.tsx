'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Clock,
  FileCheck,
  Building,
} from 'lucide-react';

interface MonitoringData {
  period: {
    id: string;
    year: number;
    status: string;
    isLocked: boolean;
  };
  progress: {
    totalCriteria: number;
    evaluatedCriteria: number;
    percentComplete: number;
  };
  dimensionProgress: Array<{
    code: string;
    name: string;
    totalCriteria: number;
    evaluatedCriteria: number;
    percentComplete: number;
  }>;
  draftGaps: Array<{
    parameterCode: string;
    criterionLetter: string;
    findingsGap: string;
    reviewNotes: string | null;
  }>;
}

export function LiveMonitoringTab() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Confirm Draft Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const res = await api.get('/counterpart/monitoring-progress');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat status live monitoring.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  const handleConfirmDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.period?.id) return;

    setConfirming(true);
    setConfirmError(null);

    try {
      const res = await api.post('/counterpart/confirm-draft', {
        periodId: data.period.id,
        approvalNotes: approvalNotes.trim() || 'Draf disetujui secara formal oleh Tim Counterpart.',
      });

      if (res.data?.success) {
        setConfirmSuccess('Draf hasil penilaian berhasil dikonfirmasi dan difinalisasi.');
        setIsConfirmModalOpen(false);
        fetchProgress();
      }
    } catch (err: any) {
      setConfirmError(err.response?.data?.error?.message || 'Gagal mengonfirmasi draf penilaian.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Memuat data live monitoring...</div>;
  }

  if (error) {
    return <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-md">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-primary-900">Live Monitoring Progres Asesor</h2>
          <p className="text-xs text-slate-500">
            Pantau kemajuan reviu dokumen oleh konsultan penilai secara transparan & konfirmasi draf akhir
          </p>
        </div>

        {data?.period?.isLocked ? (
          <span className="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-md border border-emerald-300">
            <Lock className="h-3.5 w-3.5 mr-1 text-emerald-700" />
            Laporan Difinalisasi & Terkunci (FINALIZED)
          </span>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsConfirmModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Konfirmasi Persetujuan Draf Hasil
          </Button>
        )}
      </div>

      {confirmSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-md">
          {confirmSuccess}
        </div>
      )}

      {/* Progress Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border-subtle md:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
                  Kemajuan Reviu Bukti Oleh Asesor
                </CardTitle>
                <span className="font-bold text-base text-brand-blue-600">
                  {data.progress.percentComplete.toFixed(1)}%
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-brand-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(data.progress.percentComplete, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 flex items-center justify-between">
                <span>
                  {data.progress.evaluatedCriteria} dari {data.progress.totalCriteria} kriteria telah direviu
                </span>
                <span className="font-semibold text-primary-900">
                  Tahun Buku {data.period.year}
                </span>
              </p>
            </CardContent>
          </Card>

          <Card className="border-border-subtle">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
                Status Asesmen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-primary-900">{data.period.status}</div>
              <p className="text-xs text-slate-500 mt-1">
                {data.period.isLocked
                  ? 'Seluruh data terkunci secara resmi (Immutability Lock).'
                  : 'Proses evaluasi dokumen dan klarifikasi masih berlangsung.'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rincian 5 Dimensi */}
      {data && (
        <div className="bg-white rounded-lg border border-border-subtle shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="text-sm font-bold text-primary-900">Kemajuan Reviu per 5 Dimensi</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {data.dimensionProgress.map((dim) => (
              <div
                key={dim.code}
                className="p-3.5 rounded-lg border border-border-subtle bg-surface-bg/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-brand-blue-700 bg-white px-2 py-0.5 rounded border border-border-subtle">
                    {dim.code}
                  </span>
                  <span className="text-xs font-bold text-primary-900">
                    {dim.percentComplete.toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-semibold line-clamp-1">{dim.name}</p>
                <p className="text-[11px] text-slate-500">
                  {dim.evaluatedCriteria} / {dim.totalCriteria} kriteria
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Celah Temuan Draf (Draft Gaps) */}
      {data && (
        <div className="bg-white rounded-lg border border-border-subtle shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-primary-900">
                Catatan Klarifikasi & Celah Temuan Asesor ({data.draftGaps.length})
              </h3>
              <p className="text-xs text-slate-500">
                Gunakan catatan ini sebagai panduan untuk mengunggah dokumen tambahan sebelum draf finalisasi
              </p>
            </div>
          </div>

          <div className="divide-y divide-border-subtle">
            {data.draftGaps.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada catatan celah temuan yang dicatat oleh asesor.
              </div>
            ) : (
              data.draftGaps.map((gap, idx) => (
                <div key={idx} className="p-6 space-y-2 hover:bg-surface-bg/50 transition-colors">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                      {gap.parameterCode} - Kriteria {gap.criterionLetter}
                    </span>
                    <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Celah Temuan Pemenuhan
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed bg-amber-50/60 p-3 rounded border border-amber-200/80 font-medium">
                    {gap.findingsGap}
                  </p>
                  {gap.reviewNotes && (
                    <p className="text-[11px] text-slate-500 italic pl-1">
                      Catatan Asesor: {gap.reviewNotes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Persetujuan Draf */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Konfirmasi & Persetujuan Draf Penilaian"
        description="Aksi ini akan memfinalisasi status penilaian dan mengunci data penilaian secara permanen (Immutability Lock)"
      >
        <form onSubmit={handleConfirmDraft} className="space-y-4">
          {confirmError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
              {confirmError}
            </div>
          )}

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">Perhatian:</span> Setelah draf disetujui, skor penilaian, catatan
            reviu, dan dokumen bukti tidak dapat diubah lagi demi menjaga integritas audit laporan resmi KBUMN.
          </div>

          <Input
            label="Catatan Pengesahan Pimpinan / Tim Counterpart"
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            placeholder="Draf penilaian telah direviu bersama Direksi dan disetujui untuk penerbitan laporan resmi."
          />

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-border-subtle">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={confirming}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={confirming}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Setujui & Finalisasi Laporan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
