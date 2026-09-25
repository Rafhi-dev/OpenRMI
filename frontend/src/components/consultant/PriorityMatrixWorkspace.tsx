'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  Grid,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  Target,
  Clock,
  Briefcase,
} from 'lucide-react';

export interface RecommendationItem {
  id: string;
  parameterCode: string;
  recommendation: string;
  targetDate: string;
  mainActivities: string;
  expectedOutput: string;
  successIndicator: string;
  unitInCharge: string;
  priorityQuadrant: number;
  horizon: 'SHORT_TERM' | 'LONG_TERM';
  status: string;
  createdAt: string;
}

interface PriorityMatrixData {
  recommendations: RecommendationItem[];
  matrix: {
    quadrant1: RecommendationItem[];
    quadrant2: RecommendationItem[];
    quadrant3: RecommendationItem[];
  };
  summary: {
    total: number;
    quadrant1Count: number;
    quadrant2Count: number;
    quadrant3Count: number;
    shortTermCount: number;
    longTermCount: number;
  };
}

interface PriorityMatrixWorkspaceProps {
  periodId: string;
  isLocked?: boolean;
}

export function PriorityMatrixWorkspace({ periodId, isLocked = false }: PriorityMatrixWorkspaceProps) {
  const [data, setData] = useState<PriorityMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<RecommendationItem | null>(null);
  const [parameterCode, setParameterCode] = useState('P01');
  const [recommendation, setRecommendation] = useState('');
  const [mainActivities, setMainActivities] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [successIndicator, setSuccessIndicator] = useState('');
  const [unitInCharge, setUnitInCharge] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [priorityQuadrant, setPriorityQuadrant] = useState<number>(1);
  const [horizon, setHorizon] = useState<'SHORT_TERM' | 'LONG_TERM'>('SHORT_TERM');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/consultant/recommendations?periodId=${periodId}`);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat matriks rekomendasi prioritas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [periodId]);

  const handleOpenAdd = (quadrant = 1) => {
    setEditingRec(null);
    setParameterCode('P01');
    setRecommendation('');
    setMainActivities('');
    setExpectedOutput('');
    setSuccessIndicator('');
    setUnitInCharge('');
    setTargetDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setPriorityQuadrant(quadrant);
    setHorizon('SHORT_TERM');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: RecommendationItem) => {
    setEditingRec(rec);
    setParameterCode(rec.parameterCode);
    setRecommendation(rec.recommendation);
    setMainActivities(rec.mainActivities);
    setExpectedOutput(rec.expectedOutput);
    setSuccessIndicator(rec.successIndicator);
    setUnitInCharge(rec.unitInCharge);
    setTargetDate(rec.targetDate ? rec.targetDate.split('T')[0] : '');
    setPriorityQuadrant(rec.priorityQuadrant);
    setHorizon(rec.horizon);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    if (!recommendation.trim() || !unitInCharge.trim() || !targetDate) {
      setSaveError('Seluruh kolom bertanda bintang (*) wajib diisi.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      if (editingRec) {
        await api.put(`/consultant/recommendations/${editingRec.id}`, {
          parameterCode,
          recommendation: recommendation.trim(),
          mainActivities: mainActivities.trim(),
          expectedOutput: expectedOutput.trim(),
          successIndicator: successIndicator.trim(),
          unitInCharge: unitInCharge.trim(),
          targetDate: new Date(targetDate).toISOString(),
          priorityQuadrant: Number(priorityQuadrant),
          horizon,
        });
      } else {
        await api.post('/consultant/recommendations', {
          periodId,
          parameterCode,
          recommendation: recommendation.trim(),
          mainActivities: mainActivities.trim(),
          expectedOutput: expectedOutput.trim(),
          successIndicator: successIndicator.trim(),
          unitInCharge: unitInCharge.trim(),
          targetDate: new Date(targetDate).toISOString(),
          priorityQuadrant: Number(priorityQuadrant),
          horizon,
        });
      }

      setIsModalOpen(false);
      await fetchRecommendations();
    } catch (err: any) {
      setSaveError(
        err.response?.data?.error?.message || err.message || 'Gagal menyimpan rekomendasi perbaikan.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isLocked) return;
    if (!confirm('Apakah Anda yakin ingin menghapus rekomendasi perbaikan ini?')) return;

    try {
      await api.delete(`/consultant/recommendations/${id}`);
      await fetchRecommendations();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal menghapus rekomendasi.');
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Memuat matriks rekomendasi 2x2...</div>;
  }

  const q1 = data?.matrix.quadrant1 || [];
  const q2 = data?.matrix.quadrant2 || [];
  const q3 = data?.matrix.quadrant3 || [];

  return (
    <div className="space-y-6">
      {/* Header and Summary Bar */}
      <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-primary-900">
              Matriks Prioritas Rekomendasi 2x2 (Impact vs Ease)
            </h3>
            <Badge variant="primary" className="text-[10px] font-mono">
              Format KBUMN
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Pengelompokan rencana aksi perbaikan risiko korporasi ke dalam 3 Kuadran Prioritas berdasarkan tingkat
            dampak perbaikan dan kemudahan implementasi, lengkap dengan horizon jangka pendek / panjang.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => handleOpenAdd(1)}
          disabled={isLocked}
          className="text-xs shrink-0 font-bold shadow-xs"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Tambah Rekomendasi
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-200">
          {error}
        </div>
      )}

      {/* 2x2 Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Kuadran 1: High Impact & High Ease (Quick Win) */}
        <div className="bg-white rounded-xl border-2 border-emerald-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-emerald-50/80 border-b border-emerald-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  Kuadran 1 (Quick Win)
                </h4>
                <p className="text-[10px] text-emerald-800">Dampak Tinggi &bull; Implementasi Mudah</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full">
              {q1.length}
            </span>
          </div>

          <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[500px] bg-emerald-50/10">
            {q1.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Belum ada rekomendasi Kuadran 1.</p>
            ) : (
              q1.map((rec) => renderRecCard(rec))
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenAdd(1)}
              disabled={isLocked}
              className="text-xs text-emerald-700 hover:text-emerald-800 w-full"
            >
              + Tambah ke Kuadran 1
            </Button>
          </div>
        </div>

        {/* Kuadran 2: High Impact & Difficult OR Low Impact & Easy (Major Initiatives) */}
        <div className="bg-white rounded-xl border-2 border-blue-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-blue-50/80 border-b border-blue-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                  Kuadran 2 (Inisiatif Strategis)
                </h4>
                <p className="text-[10px] text-blue-800">Dampak Tinggi/Sulit atau Rendah/Mudah</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-blue-800 bg-blue-200/80 px-2 py-0.5 rounded-full">
              {q2.length}
            </span>
          </div>

          <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[500px] bg-blue-50/10">
            {q2.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Belum ada rekomendasi Kuadran 2.</p>
            ) : (
              q2.map((rec) => renderRecCard(rec))
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenAdd(2)}
              disabled={isLocked}
              className="text-xs text-blue-700 hover:text-blue-800 w-full"
            >
              + Tambah ke Kuadran 2
            </Button>
          </div>
        </div>

        {/* Kuadran 3: Low Impact & Difficult (Secondary Fill-ins) */}
        <div className="bg-white rounded-xl border-2 border-amber-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-amber-50/80 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-amber-600 text-white rounded-lg">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Kuadran 3 (Pengisi Waktu)
                </h4>
                <p className="text-[10px] text-amber-800">Dampak Rendah &bull; Implementasi Sulit</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
              {q3.length}
            </span>
          </div>

          <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[500px] bg-amber-50/10">
            {q3.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Belum ada rekomendasi Kuadran 3.</p>
            ) : (
              q3.map((rec) => renderRecCard(rec))
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenAdd(3)}
              disabled={isLocked}
              className="text-xs text-amber-700 hover:text-amber-800 w-full"
            >
              + Tambah ke Kuadran 3
            </Button>
          </div>
        </div>
      </div>

      {/* Add / Edit Recommendation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !saving && setIsModalOpen(false)}
        title={editingRec ? 'Edit Rekomendasi Perbaikan KBUMN' : 'Tambah Rekomendasi Perbaikan Baru'}
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-primary-900 mb-1">
                Kode Parameter Terkait *
              </label>
              <Input
                placeholder="Contoh: P01, P04, P20"
                value={parameterCode}
                onChange={(e) => setParameterCode(e.target.value.toUpperCase())}
                required
                className="text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary-900 mb-1">
                Kuadran Prioritas *
              </label>
              <select
                value={priorityQuadrant}
                onChange={(e) => setPriorityQuadrant(Number(e.target.value))}
                className="w-full text-xs bg-white border border-border-subtle rounded-md px-3 py-2 text-primary-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 font-bold"
              >
                <option value={1}>Kuadran 1: Cepat & Berdampak Tinggi (Quick Win)</option>
                <option value={2}>Kuadran 2: Inisiatif Strategis Jangka Panjang</option>
                <option value={3}>Kuadran 3: Sekunder / Pengisi Waktu</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-900 mb-1">
              Rumusan Rekomendasi Perbaikan *
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Penyusunan dan sosialisasi SOP limit risiko terintegrasi..."
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              required
              className="w-full text-xs bg-white border border-border-subtle rounded-md p-2.5 text-primary-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-900 mb-1">
              Aktivitas Utama Pelaksanaan *
            </label>
            <Input
              placeholder="Contoh: FGD lintas divisi, benchmarking BUMN sejenis, penyusunan draf"
              value={mainActivities}
              onChange={(e) => setMainActivities(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-primary-900 mb-1">
                Output yang Diharapkan *
              </label>
              <Input
                placeholder="Contoh: SK Direksi tentang SOP Manajemen Risiko"
                value={expectedOutput}
                onChange={(e) => setExpectedOutput(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary-900 mb-1">
                Indikator Keberhasilan *
              </label>
              <Input
                placeholder="Contoh: Dokumen disahkan & disosialisasikan 100%"
                value={successIndicator}
                onChange={(e) => setSuccessIndicator(e.target.value)}
                required
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-primary-900 mb-1">
                Unit In Charge (UIC) *
              </label>
              <Input
                placeholder="Contoh: Divisi Manajemen Risiko"
                value={unitInCharge}
                onChange={(e) => setUnitInCharge(e.target.value)}
                required
                className="text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary-900 mb-1">
                Target Selesai *
              </label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary-900 mb-1">
                Horizon Waktu
              </label>
              <select
                value={horizon}
                onChange={(e) => setHorizon(e.target.value as any)}
                className="w-full text-xs bg-white border border-border-subtle rounded-md px-3 py-2 text-primary-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
              >
                <option value="SHORT_TERM">Jangka Pendek (&lt; 1 Tahun)</option>
                <option value="LONG_TERM">Jangka Panjang (&gt; 1 Tahun)</option>
              </select>
            </div>
          </div>

          {saveError && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
            >
              {saving ? 'Menyimpan...' : editingRec ? 'Simpan Perubahan' : 'Buat Rekomendasi'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );

  function renderRecCard(rec: RecommendationItem) {
    return (
      <div
        key={rec.id}
        className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs transition-all space-y-2 text-xs"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
              {rec.parameterCode}
            </span>
            <span className="text-[10px] text-slate-400">
              {rec.horizon === 'SHORT_TERM' ? 'Short-term' : 'Long-term'}
            </span>
          </div>

          {!isLocked && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleOpenEdit(rec)}
                className="p-1 text-slate-400 hover:text-brand-blue-600 rounded"
                title="Edit"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(rec.id)}
                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                title="Hapus"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <p className="font-bold text-primary-900 leading-snug">{rec.recommendation}</p>

        <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
          <p>
            <span className="text-slate-400">UIC:</span> <strong>{rec.unitInCharge}</strong>
          </p>
          <p>
            <span className="text-slate-400">Target:</span>{' '}
            {new Date(rec.targetDate).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>
    );
  }
}
