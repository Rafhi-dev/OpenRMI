'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Edit3,
  BarChart3,
  Users,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface DimensionDelta {
  current: number | null;
  previous: number;
  delta: number | null;
  trend: 'INCREASE' | 'DECREASE' | 'STAGNANT';
}

interface HistoricalData {
  historical: {
    previousYear: number;
    dimensionScores: Record<string, number>;
    aspectDimScore?: number;
    perfScore?: number;
    finalRmiScore?: number;
    maturityPhase?: string;
    notes?: string;
  } | null;
  current: {
    dimensionScores: Record<string, number | null>;
    aspectDimScore: number | null;
    perfScore: number | null;
    finalRmiScore: number | null;
    maturityPhase: string | null;
  };
  yoyComparison: {
    previousYear: number;
    currentYear: number;
    dimensionDeltas: Record<string, DimensionDelta>;
    finalRmiDelta: number | null;
    finalRmiTrend: 'INCREASE' | 'DECREASE' | 'STAGNANT';
  } | null;
}

interface PerceptionGapData {
  assessorD1Score: number | null;
  assessorP1Score: number | null;
  employeeSurveyScore: number | null;
  totalResponses: number;
  delta: number | null;
  gapCategory: 'OVERCONFIDENT' | 'ALIGNED' | 'NEEDS_EDUCATION' | 'NOT_APPLICABLE';
  gapCategoryLabel: string;
  interpretation: string;
}

interface HistoricalBaselineTabProps {
  periodId?: string;
  isLocked?: boolean;
}

export function HistoricalBaselineTab({ periodId, isLocked = false }: HistoricalBaselineTabProps) {
  const [data, setData] = useState<HistoricalData | null>(null);
  const [gapData, setGapData] = useState<PerceptionGapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Form Input Baseline
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [previousYear, setPreviousYear] = useState<number>(new Date().getFullYear() - 1);
  const [d1Score, setD1Score] = useState<string>('3.00');
  const [d2Score, setD2Score] = useState<string>('3.00');
  const [d3Score, setD3Score] = useState<string>('3.00');
  const [d4Score, setD4Score] = useState<string>('3.00');
  const [d5Score, setD5Score] = useState<string>('3.00');
  const [aspectDimScore, setAspectDimScore] = useState<string>('3.00');
  const [perfScore, setPerfScore] = useState<string>('80');
  const [finalRmiScore, setFinalRmiScore] = useState<string>('3.00');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = periodId ? `/historical/comparison?periodId=${periodId}` : '/historical/comparison';
      const gapUrl = periodId ? `/surveys/perception-gap?periodId=${periodId}` : '/surveys/perception-gap';

      const [resHist, resGap] = await Promise.allSettled([
        api.get(url),
        api.get(gapUrl),
      ]);

      if (resHist.status === 'fulfilled' && resHist.value.data?.success) {
        setData(resHist.value.data.data);

        // Pre-fill form if historical exists
        const h = resHist.value.data.data.historical;
        if (h) {
          setPreviousYear(h.previousYear);
          if (h.dimensionScores) {
            setD1Score(String(h.dimensionScores.D1 ?? '3.00'));
            setD2Score(String(h.dimensionScores.D2 ?? '3.00'));
            setD3Score(String(h.dimensionScores.D3 ?? '3.00'));
            setD4Score(String(h.dimensionScores.D4 ?? '3.00'));
            setD5Score(String(h.dimensionScores.D5 ?? '3.00'));
          }
          if (h.aspectDimScore) setAspectDimScore(String(h.aspectDimScore));
          if (h.perfScore) setPerfScore(String(h.perfScore));
          if (h.finalRmiScore) setFinalRmiScore(String(h.finalRmiScore));
          if (h.notes) setNotes(h.notes);
        }
      }

      if (resGap.status === 'fulfilled' && resGap.value.data?.success) {
        setGapData(resGap.value.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat perbandingan data historis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [periodId]);

  const handleSaveBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodId) {
      setSaveError('ID Periode Penilaian tidak tersedia.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await api.post('/historical', {
        periodId,
        previousYear: Number(previousYear),
        dimensionScores: {
          D1: parseFloat(d1Score),
          D2: parseFloat(d2Score),
          D3: parseFloat(d3Score),
          D4: parseFloat(d4Score),
          D5: parseFloat(d5Score),
        },
        aspectDimScore: parseFloat(aspectDimScore),
        perfScore: parseFloat(perfScore),
        finalRmiScore: parseFloat(finalRmiScore),
        notes: notes.trim() || undefined,
      });

      setIsInputModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setSaveError(
        err.response?.data?.error?.message || err.message || 'Gagal menyimpan baseline historis.'
      );
    } finally {
      setSaving(false);
    }
  };

  const dimensionLabels: Record<string, string> = {
    D1: 'Budaya & Kapabilitas Risiko',
    D2: 'Organisasi & Tata Kelola',
    D3: 'Kerangka Risiko & Kepatuhan',
    D4: 'Proses & Kontrol Risiko',
    D5: 'Model, Data & Teknologi',
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Memuat analisis komparasi historis...</div>;
  }

  if (error) {
    return <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-xl">{error}</div>;
  }

  const yoy = data?.yoyComparison;

  return (
    <div className="space-y-6">
      {/* Header & Baseline Input Action */}
      <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-primary-900">
              Analisis Komparasi Capaian YoY & Baseline Historis
            </h3>
            <Badge variant="outline" className="text-[11px] font-mono">
              FR-7.4 &bull; FR-7.5
            </Badge>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Sesuai regulasi KBUMN, Tim Counterpart dan Konsultan memiliki hak setara untuk mencatat baseline penilaian
            tahun sebelumnya. Analisis perubahan YoY dan grafik komparasi disajikan secara <strong>Read-Only</strong>.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsInputModalOpen(true)}
          className="text-xs shrink-0"
        >
          <Edit3 className="h-4 w-4 mr-1.5" />
          {data?.historical ? 'Perbarui Baseline Historis' : 'Input Baseline Tahun Lalu'}
        </Button>
      </div>

      {/* YoY Comparison Grouped Visualizer */}
      <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-primary-900">
              Komparasi 5 Dimensi: Tahun Berjalan vs Tahun Lalu
            </h4>
            <p className="text-xs text-slate-500">
              Perbandingan capaian skor per dimensi terhadap baseline tahun sebelumnya
            </p>
          </div>
          {yoy && (
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-emerald-600 rounded-sm" />
                <span className="text-slate-700">Tahun Ini ({yoy.currentYear})</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-slate-300 rounded-sm" />
                <span className="text-slate-500">Tahun Lalu ({yoy.previousYear})</span>
              </div>
            </div>
          )}
        </div>

        {!yoy ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
            <BarChart3 className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-primary-900">Baseline Tahun Sebelumnya Belum Diinput</p>
            <p className="text-[11px] text-slate-500">
              Klik tombol <strong>Input Baseline Tahun Lalu</strong> untuk mengisi data skor historis korporasi.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(yoy.dimensionDeltas).map(([code, deltaInfo]) => {
              const currentScore = deltaInfo.current ?? 0;
              const prevScore = deltaInfo.previous;
              const deltaVal = deltaInfo.delta;

              return (
                <div key={code} className="space-y-1.5 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {code}
                      </span>
                      <span className="font-bold text-primary-900">{dimensionLabels[code] || code}</span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-slate-500 text-[11px]">
                        Tahun Lalu: <strong className="text-slate-700">{prevScore.toFixed(2)}</strong>
                      </span>
                      <span className="text-emerald-700 text-xs">
                        Tahun Ini:{' '}
                        <strong>
                          {deltaInfo.current !== null ? deltaInfo.current.toFixed(2) : 'Menunggu Reviu'}
                        </strong>
                      </span>

                      {deltaVal !== null && (
                        <span
                          className={`inline-flex items-center space-x-0.5 text-xs font-bold px-2 py-0.5 rounded ${
                            deltaVal > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : deltaVal < 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {deltaVal > 0 ? (
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-700" />
                          ) : deltaVal < 0 ? (
                            <TrendingDown className="h-3.5 w-3.5 text-rose-700" />
                          ) : (
                            <Minus className="h-3.5 w-3.5 text-slate-600" />
                          )}
                          <span>
                            {deltaVal > 0 ? `+${deltaVal.toFixed(2)}` : deltaVal.toFixed(2)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Grouped Bar Visual */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-400 w-16">Berjalan</span>
                      <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${(currentScore / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-400 w-16">Sebelumnya</span>
                      <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-slate-400 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${(prevScore / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Perception Gap Analysis (Survei vs Asesor) */}
      <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-primary-900">
                Analisis Kesenjangan Persepsi Budaya Risiko (Perception Gap)
              </h4>
              <Badge variant="outline" className="text-[10px] font-mono">
                FR-7.6
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Perbandingan persepsi karyawan melalui survei mandiri vs bukti faktual hasil reviu Asesor Dimensi 1
            </p>
          </div>
        </div>

        {!gapData || gapData.gapCategory === 'NOT_APPLICABLE' ? (
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
            <Users className="h-7 w-7 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-primary-900">Data Kesenjangan Belum Mencukupi</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Memerlukan evaluasi dokumen Dimensi 1 oleh Asesor dan partisipasi responden survei budaya risiko.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold">Skor Reviu Asesor (D1)</span>
              <h3 className="text-2xl font-extrabold text-primary-900">
                {gapData.assessorD1Score ? gapData.assessorD1Score.toFixed(2) : '-'}
              </h3>
              <p className="text-[10px] text-slate-400">Bukti dokumen & kebijakan</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold">Skor Survei Karyawan</span>
              <h3 className="text-2xl font-extrabold text-primary-900">
                {gapData.employeeSurveyScore ? gapData.employeeSurveyScore.toFixed(2) : '-'}
              </h3>
              <p className="text-[10px] text-slate-400">{gapData.totalResponses} responden anonim</p>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
              <span className="text-[11px] text-emerald-800 font-semibold">Selisih Persepsi (&Delta;)</span>
              <h3 className="text-2xl font-extrabold text-emerald-700">
                {gapData.delta !== null ? (gapData.delta > 0 ? `+${gapData.delta.toFixed(2)}` : gapData.delta.toFixed(2)) : '-'}
              </h3>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                {gapData.gapCategoryLabel}
              </span>
            </div>

            <div className="md:col-span-3 p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
              <span className="font-bold block mb-0.5">Interpretasi Kesenjangan:</span>
              {gapData.interpretation}
            </div>
          </div>
        )}
      </div>

      {/* Input Baseline Modal */}
      <Modal
        isOpen={isInputModalOpen}
        onClose={() => !saving && setIsInputModalOpen(false)}
        title="Input / Edit Baseline Skor Historis Korporasi"
        maxWidth="xl"
      >
        <form onSubmit={handleSaveBaseline} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-primary-900 mb-1">
              Tahun Buku Penilaian Sebelumnya *
            </label>
            <Input
              type="number"
              value={previousYear}
              onChange={(e) => setPreviousYear(Number(e.target.value))}
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-2 border-t border-b border-slate-100 py-3">
            <span className="text-xs font-bold text-primary-900 block">
              Skor 5 Dimensi Tahun Sebelumnya (Skala 1.00 s.d. 5.00)
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[11px] text-slate-500 font-medium">D1 (Budaya & Kapabilitas)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  max="5"
                  value={d1Score}
                  onChange={(e) => setD1Score(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-medium">D2 (Organisasi & Tata Kelola)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  max="5"
                  value={d2Score}
                  onChange={(e) => setD2Score(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-medium">D3 (Kerangka & Kepatuhan)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  max="5"
                  value={d3Score}
                  onChange={(e) => setD3Score(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-medium">D4 (Proses & Kontrol)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  max="5"
                  value={d4Score}
                  onChange={(e) => setD4Score(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] text-slate-500 font-medium">D5 (Model, Data & Teknologi)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  max="5"
                  value={d5Score}
                  onChange={(e) => setD5Score(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-slate-500 font-medium">Skor Aspek Dimensi</label>
              <Input
                type="number"
                step="0.01"
                value={aspectDimScore}
                onChange={(e) => setAspectDimScore(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-medium">Skor Kinerja (0-100)</label>
              <Input
                type="number"
                step="0.1"
                value={perfScore}
                onChange={(e) => setPerfScore(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-medium">Skor Akhir RMI</label>
              <Input
                type="number"
                step="0.01"
                value={finalRmiScore}
                onChange={(e) => setFinalRmiScore(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-900 mb-1">
              Catatan / Referensi Laporan Sebelumnya (Opsional)
            </label>
            <Input
              placeholder="Contoh: Mengacu pada Laporan Asesmen RMI Tahun Buku 2023 oleh BPKP"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
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
              onClick={() => setIsInputModalOpen(false)}
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
              {saving ? 'Menyimpan...' : 'Simpan Data Historis'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
