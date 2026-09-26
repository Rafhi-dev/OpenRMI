'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  UserCheck,
  FileCheck,
  Building2,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface DimensionProgressItem {
  dimensionId: number;
  dimensionCode: string;
  dimensionName: string;
  totalCriteria: number;
  reviewedCriteria: number;
  percentage: number;
  averageDraftScore: number;
}

interface FindingGapItem {
  parameterCode: string;
  parameterTitle: string;
  findingsGap: string;
  interviewNotes?: string;
}

interface MonitoringData {
  period: {
    id: string;
    year: number;
    status: string;
    modelCluster: string;
    isLocked: boolean;
    tenant: {
      name: string;
      code: string;
      industryCluster: string;
    };
    assignments: Array<{
      consultant: {
        fullName: string;
        agencyName: string;
      };
    }>;
  };
  progress: {
    totalCriteria: number;
    reviewedCriteria: number;
    percentage: number;
    isComplete: boolean;
  };
  dimensionProgress: DimensionProgressItem[];
  findingsAndGaps: FindingGapItem[];
  supplementarySummary: {
    total: number;
    completed: number;
    processing: number;
    pending: number;
  };
}

interface LiveMonitoringTabProps {
  periodId?: string;
  onStatusChange?: () => void;
}

export function LiveMonitoringTab({ periodId, onStatusChange }: LiveMonitoringTabProps) {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Confirmation Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [decision, setDecision] = useState<'APPROVED' | 'REVISION_REQUESTED'>('APPROVED');
  const [signatoryName, setSignatoryName] = useState('');
  const [signatoryTitle, setSignatoryTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = periodId
        ? `/counterpart/monitoring-progress?periodId=${periodId}`
        : '/counterpart/monitoring-progress';
      const res = await api.get(url);

      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat progres pemantauan asesor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [periodId]);

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.period?.id) return;

    if (!signatoryName.trim() || !signatoryTitle.trim()) {
      setSubmitError('Nama pejabat dan jabatan penandatangan wajib diisi.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await api.post('/counterpart/confirm-draft', {
        periodId: data.period.id,
        decision,
        signatoryName: signatoryName.trim(),
        signatoryTitle: signatoryTitle.trim(),
        notes: notes.trim() || undefined,
      });

      setIsConfirmModalOpen(false);
      await fetchProgress();
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.error?.message || err.message || 'Gagal mengirimkan konfirmasi hasil penilaian.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStageStep = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 1;
      case 'EVIDENCE_GATHERING':
        return 2;
      case 'UNDER_REVIEW':
        return 3;
      case 'INTERVIEW_SURVEY':
        return 4;
      case 'SCORING_STAGE':
        return 5;
      case 'DRAFT_CONFIRMATION':
        return 6;
      case 'FINALIZED':
        return 7;
      default:
        return 2;
    }
  };

  const stages = [
    { step: 1, label: 'Inisiasi' },
    { step: 2, label: 'Unggah Bukti' },
    { step: 3, label: 'Reviu Asesor' },
    { step: 4, label: 'Wawancara & FGD' },
    { step: 5, label: 'Kalkulasi Skor' },
    { step: 6, label: 'Konfirmasi Draf' },
    { step: 7, label: 'Finalisasi' },
  ];

  if (loading && !data) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        <p className="text-xs text-slate-500 font-medium">Menghubungkan ke pemantauan real-time reviu asesor...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl space-y-3">
        <div className="flex items-center space-x-2 font-bold text-sm">
          <AlertCircle className="h-5 w-5 text-rose-600" />
          <span>Gagal Memuat Progres Asesmen</span>
        </div>
        <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchProgress}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  const currentStep = getStageStep(data.period.status);
  const activeConsultant = data.period.assignments?.[0]?.consultant;
  const isFinalized = data.period.isLocked || data.period.status === 'FINALIZED';

  return (
    <div className="space-y-6">
      {/* Assessment Lifecycle Stage Stepper */}
      <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-primary-900">Tahapan Siklus Penilaian RMI KBUMN</h3>
            <p className="text-xs text-slate-500">
              Perusahaan: <span className="font-semibold text-slate-700">{data.period.tenant.name}</span> &bull;
              Tahun Buku <span className="font-bold text-primary-900">{data.period.year}</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchProgress} className="text-xs text-slate-500">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Muat Ulang
          </Button>
        </div>

        <div className="relative flex items-center justify-between pt-2">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-100 w-full z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-600 transition-all duration-700 z-0"
            style={{ width: `${((currentStep - 1) / (stages.length - 1)) * 100}%` }}
          />

          {stages.map((st) => {
            const isPassed = currentStep >= st.step;
            const isCurrent = currentStep === st.step;

            return (
              <div key={st.step} className="relative z-10 flex flex-col items-center">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                      : isPassed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {isPassed ? <CheckCircle2 className="h-4 w-4" /> : st.step}
                </div>
                <span
                  className={`text-[10px] mt-1.5 font-semibold text-center whitespace-nowrap hidden sm:block ${
                    isCurrent
                      ? 'text-emerald-700 font-bold'
                      : isPassed
                      ? 'text-primary-900'
                      : 'text-slate-400'
                  }`}
                >
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Reviu Konsultan</p>
            <h3 className="text-xl font-extrabold text-primary-900">{data.progress.percentage}%</h3>
            <p className="text-[11px] text-slate-500">
              {data.progress.reviewedCriteria} dari {data.progress.totalCriteria} kriteria dinilai
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-brand-blue-50 text-brand-blue-600 rounded-lg">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Lead Asesor Independen</p>
            <h3 className="text-xs font-bold text-primary-900 truncate mt-1">
              {activeConsultant?.fullName || 'Belum Ditugaskan'}
            </h3>
            <p className="text-[11px] text-brand-blue-600 truncate">
              {activeConsultant?.agencyName || 'Vendor Asesmen Terdaftar'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Dokumen Pasca-FGD</p>
            <h3 className="text-xl font-extrabold text-primary-900">
              {data.supplementarySummary?.completed ?? 0} / {data.supplementarySummary?.total ?? (data.supplementarySummary as any)?.totalDocuments ?? 0}
            </h3>
            <p className="text-[11px] text-slate-500">Siap dianalisis cerdas AI</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${isFinalized ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {isFinalized ? <Lock className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Status Konfirmasi Draf</p>
            <h3 className="text-xs font-bold text-primary-900 mt-1">
              {isFinalized ? 'Terkonfirmasi & Final' : 'Menunggu Telaah'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {isFinalized ? 'Laporan terkunci permanen' : 'Terbuka untuk klarifikasi'}
            </p>
          </div>
        </div>
      </div>

      {/* Dimension Progress Table */}
      <div className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden space-y-4 p-6">
        <div>
          <h3 className="text-sm font-bold text-primary-900">Progres Penilaian Per 5 Dimensi Baku KBUMN</h3>
          <p className="text-xs text-slate-500">
            Transparansi status pemeriksaan eviden dan estimasi rerata capaian draf kriteria per dimensi
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-border-subtle text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Dimensi Penilaian</th>
                <th className="px-4 py-3">Kriteria Diperiksa</th>
                <th className="px-4 py-3">Progres Reviu</th>
                <th className="px-4 py-3 text-right">Rerata Draf Skor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {data.dimensionProgress.map((dim) => (
                <tr key={dim.dimensionId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-primary-900">
                    <span className="font-mono text-emerald-700 mr-2">{dim.dimensionCode}</span>
                    {dim.dimensionName}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {dim.reviewedCriteria} / {dim.totalCriteria} Kriteria
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="w-48 flex items-center space-x-2">
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full"
                          style={{ width: `${dim.percentage}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">{dim.percentage}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-primary-900">
                    {dim.averageDraftScore > 0 ? (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                        {dim.averageDraftScore.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">Belum ada skor</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Findings and Gaps Table */}
      <div className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-primary-900">Transparansi Catatan Celah Temuan Asesor</h3>
          <p className="text-xs text-slate-500">
            Daftar parameter yang memiliki gap temuan hasil evaluasi awal dokumen bukti. Disajikan secara transparan
            agar Tim Counterpart dapat menyiapkan sanggahan atau dokumen tambahan pasca-FGD.
          </p>
        </div>

        {data.findingsAndGaps.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
            <p className="text-xs font-bold text-primary-900">Belum Ada Celah Temuan Tercatat</p>
            <p className="text-[11px] text-slate-500">
              Asesor belum mencatatkan gap pemenuhan dokumen bukti pada draf penilaian saat ini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle border border-border-subtle rounded-xl overflow-hidden">
            {data.findingsAndGaps.map((item, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50/50 transition-colors space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                    {item.parameterCode}
                  </span>
                  <span className="text-xs font-bold text-primary-900">{item.parameterTitle}</span>
                </div>
                <div className="bg-rose-50/70 p-3 rounded-lg border border-rose-200 text-xs text-rose-900 leading-relaxed">
                  <span className="font-bold text-rose-800 block mb-0.5">Catatan Kesenjangan / Gap:</span>
                  {item.findingsGap}
                </div>
                {item.interviewNotes && (
                  <p className="text-[11px] text-slate-600 italic">
                    Konfirmasi Wawancara: &quot;{item.interviewNotes}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation & Finalization Action Banner */}
      <div
        className={`rounded-xl border p-6 flex flex-col md:flex-row items-center justify-between gap-4 ${
          isFinalized
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
        }`}
      >
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start space-x-2">
            {isFinalized ? (
              <Lock className="h-5 w-5 text-emerald-700" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-white" />
            )}
            <h4 className={`text-base font-bold ${isFinalized ? 'text-emerald-900' : 'text-white'}`}>
              {isFinalized
                ? 'Penilaian Telah Disahkan & Terkunci Permanen'
                : 'Pengesahan & Konfirmasi Draf Hasil Penilaian'}
            </h4>
          </div>
          <p className={`text-xs ${isFinalized ? 'text-emerald-700' : 'text-emerald-100'} max-w-xl leading-relaxed`}>
            {isFinalized
              ? 'Laporan penilaian RMI resmi untuk periode ini telah disetujui oleh Direksi / Tim Counterpart dan terkunci permanen untuk penerbitan laporan resmi KBUMN.'
              : 'Setelah seluruh tahapan reviu dokumen dan klarifikasi FGD tuntas, Direksi / Pimpinan Tim Counterpart dapat menandatangani dan mengesahkan draf hasil penilaian.'}
          </p>
        </div>

        {!isFinalized ? (
          <Button
            size="lg"
            onClick={() => setIsConfirmModalOpen(true)}
            className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs whitespace-nowrap shadow-md shrink-0"
          >
            <ShieldCheck className="h-4 w-4 mr-2 text-emerald-700" />
            Konfirmasi & Sahkan Draf Penilaian
          </Button>
        ) : (
          <Badge variant="success" className="px-4 py-2 text-xs font-bold shrink-0">
            FINALIZED & LOCKED
          </Badge>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => !submitting && setIsConfirmModalOpen(false)}
        title="Pengesahan Draf Hasil Penilaian RMI KBUMN"
        maxWidth="xl"
      >
        <form onSubmit={handleConfirmSubmit} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-border-subtle text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Perusahaan:</span>
              <span className="font-bold text-primary-900">{data.period.tenant.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tahun Buku Asesmen:</span>
              <span className="font-bold text-primary-900">{data.period.year}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Progres Reviu Asesor:</span>
              <span className="font-bold text-emerald-700">{data.progress.percentage}% Selesai</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-900 mb-1">
              Keputusan Pengesahan Draf
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all ${
                  decision === 'APPROVED'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-bold'
                    : 'border-border-subtle bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value="APPROVED"
                  checked={decision === 'APPROVED'}
                  onChange={() => setDecision('APPROVED')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs">Setujui & Kunci Final (Approved)</span>
              </label>

              <label
                className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all ${
                  decision === 'REVISION_REQUESTED'
                    ? 'border-amber-500 bg-amber-50/60 text-amber-900 font-bold'
                    : 'border-border-subtle bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value="REVISION_REQUESTED"
                  checked={decision === 'REVISION_REQUESTED'}
                  onChange={() => setDecision('REVISION_REQUESTED')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs">Minta Perbaikan (Revision)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-900 mb-1">
              Nama Pejabat Penandatangan *
            </label>
            <Input
              placeholder="Contoh: Ir. Hendra Kusuma, M.M."
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-900 mb-1">
              Jabatan Resmi Pejabat *
            </label>
            <Input
              placeholder="Contoh: Direktur Utama / VP Enterprise Risk Management"
              value={signatoryTitle}
              onChange={(e) => setSignatoryTitle(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-900 mb-1">
              Catatan Resmi Pengesahan (Opsional)
            </label>
            <Input
              placeholder="Contoh: Draf telah ditelaah bersama jajaran Direksi dan disetujui tanpa sanggahan."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          {submitError && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
            >
              {submitting ? 'Menyimpan Pengesahan...' : 'Kirim Pengesahan Resmi'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
