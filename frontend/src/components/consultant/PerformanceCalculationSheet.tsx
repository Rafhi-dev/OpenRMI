'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Calculator,
  ShieldAlert,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Scale,
} from 'lucide-react';

export type BumnRating = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'D';

interface PerformanceData {
  periodId: string;
  aspectDimensionScore: number;
  perfEvaluation?: {
    finalRating: BumnRating;
    kpmrScore: number;
    compositeRating: number;
    spiReviewNotes?: string;
  };
  calculation?: {
    meetsThreshold: boolean;
    rawPerformanceScore: number;
    ratingScore: number;
    compositeScore: number;
    penalty: number;
    finalRmiScore: number;
    status: string;
  };
  finalRmiScore: number | null;
  maturityPhase: string | null;
}

interface PerformanceCalculationSheetProps {
  periodId: string;
  isLocked?: boolean;
}

export function PerformanceCalculationSheet({ periodId, isLocked = false }: PerformanceCalculationSheetProps) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Inputs
  const [finalRating, setFinalRating] = useState<BumnRating>('A');
  const [kpmrScore, setKpmrScore] = useState<string>('80');
  const [compositeRating, setCompositeRating] = useState<number>(2);
  const [spiReviewNotes, setSpiReviewNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const fetchPerformance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/consultant/performance?periodId=${periodId}`);
      if (res.data?.success) {
        const d: PerformanceData = res.data.data;
        setData(d);

        if (d.perfEvaluation) {
          setFinalRating(d.perfEvaluation.finalRating);
          setKpmrScore(String(d.perfEvaluation.kpmrScore));
          setCompositeRating(d.perfEvaluation.compositeRating);
          setSpiReviewNotes(d.perfEvaluation.spiReviewNotes || '');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat evaluasi aspek kinerja.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [periodId]);

  // Rating Conversion Map (Permen KBUMN)
  const ratingConversionMap: Record<BumnRating, number> = {
    AAA: 100,
    AA: 90,
    A: 79,
    BBB: 67,
    BB: 56,
    B: 44,
    CCC: 33,
    D: 10,
  };

  // Composite Rating Conversion Map
  const compositeConversionMap: Record<number, number> = {
    1: 100,
    2: 78,
    3: 55,
    4: 33,
    5: 10,
  };

  // Live Calculation
  const liveCalculation = useMemo(() => {
    const aspectDimScore = data?.aspectDimensionScore ?? 0;
    const meetsThreshold = aspectDimScore >= 3.0;

    const ratingVal = ratingConversionMap[finalRating] ?? 79;
    const compositeVal = compositeConversionMap[compositeRating] ?? 78;

    const rawPerformanceScore = ratingVal * 0.5 + compositeVal * 0.5;

    let penalty = 0.0;
    if (meetsThreshold) {
      if (rawPerformanceScore <= 50) penalty = -1.0;
      else if (rawPerformanceScore <= 65) penalty = -0.75;
      else if (rawPerformanceScore <= 80) penalty = -0.5;
      else if (rawPerformanceScore <= 90) penalty = -0.25;
      else penalty = 0.0;
    }

    const calculatedFinalRmi = Math.max(1.0, Math.min(5.0, aspectDimScore + penalty));

    let maturityPhase = 'Fase Awal';
    if (calculatedFinalRmi >= 5.0) maturityPhase = 'Fase Praktik Terbaik (Best Practice)';
    else if (calculatedFinalRmi >= 4.0) maturityPhase = 'Fase Praktik yang Lebih Baik';
    else if (calculatedFinalRmi >= 3.0) maturityPhase = 'Fase Praktik yang Baik';
    else if (calculatedFinalRmi >= 2.0) maturityPhase = 'Fase Berkembang';

    return {
      meetsThreshold,
      ratingScore: ratingVal,
      compositeScore: compositeVal,
      rawPerformanceScore: Math.round(rawPerformanceScore * 10) / 10,
      penalty,
      calculatedFinalRmi: Math.round(calculatedFinalRmi * 100) / 100,
      maturityPhase,
    };
  }, [data, finalRating, compositeRating]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setSaving(true);
    setError(null);
    setSaveSuccess(null);

    try {
      await api.post('/consultant/performance', {
        periodId,
        finalRating,
        kpmrScore: parseFloat(kpmrScore) || 0,
        compositeRating: Number(compositeRating),
        spiReviewNotes: spiReviewNotes.trim() || undefined,
      });

      setSaveSuccess('Evaluasi aspek kinerja & klausul gating berhasil disimpan.');
      await fetchPerformance();
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || err.message || 'Gagal menyimpan evaluasi kinerja.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Memuat lembar kalkulasi kinerja...</div>;
  }

  const aspectDimScore = data?.aspectDimensionScore ?? 0;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-primary-900">
              Lembar Kalkulasi Aspek Kinerja & Klausul Ambang Batas (Gating)
            </h3>
            <Badge variant="primary" className="text-[10px] font-mono">
              PER-2/MBU/03/2023
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Aspek Kinerja mengukur tingkat kesehatan BUMN (Final Rating) dan Peringkat Komposit Risiko. Sesuai
            regulasi, aspek ini <strong>hanya dihitung jika Skor Aspek Dimensi &ge; 3.00</strong>.
          </p>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-right shrink-0">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Skor Aspek Dimensi</span>
          <span className="text-xl font-extrabold text-primary-900">{aspectDimScore.toFixed(2)}</span>
          <span className="text-[11px] text-slate-400 block">Rata-rata 42 Parameter</span>
        </div>
      </div>

      {/* Gating Clause Alert Banner */}
      {aspectDimScore < 3.0 ? (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3.5 text-amber-900">
          <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 leading-relaxed">
            <h4 className="font-bold text-sm text-amber-950">
              Klausul Ambang Batas Aktif (Gating Clause Active)
            </h4>
            <p>
              Skor Aspek Dimensi korporasi saat ini adalah <strong>{aspectDimScore.toFixed(2)}</strong> (&lt; 3.00). Sesuai
              ketentuan baku Kementerian BUMN, <strong>Aspek Kinerja TIDAK DIHITUNG</strong> (Penyesuaian Skor = 0.00).
            </p>
            <p className="text-[11px] text-amber-800 font-medium">
              Skor Akhir RMI otomatis dikunci sama dengan Skor Aspek Dimensi: <strong>{aspectDimScore.toFixed(2)}</strong>.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3.5 text-emerald-900">
          <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 leading-relaxed">
            <h4 className="font-bold text-sm text-emerald-950">
              Memenuhi Ambang Batas (Gating Requirement Met)
            </h4>
            <p>
              Skor Aspek Dimensi korporasi adalah <strong>{aspectDimScore.toFixed(2)}</strong> (&ge; 3.00). Penyesuaian
              skor kinerja dihitung dari kombinasi Final Rating (50%) dan Peringkat Komposit (50%) lalu dicocokkan ke
              tabel penalti resmi (-1.00 s.d. 0.00).
            </p>
          </div>
        </div>
      )}

      {/* Form and Live Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left (7 Cols): Input Form */}
        <form onSubmit={handleSave} className="lg:col-span-7 bg-white p-6 rounded-xl border border-border-subtle shadow-sm space-y-5">
          <h4 className="text-sm font-bold text-primary-900 border-b border-slate-100 pb-3">
            Parameter Penilaian Kinerja BUMN
          </h4>

          {/* Final Rating Selection */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-primary-900">
                1. Tingkat Kesehatan Peringkat Akhir (Final Rating - Bobot 50%)
              </label>
              <span className="text-xs font-bold text-brand-blue-700">
                Skor: {ratingConversionMap[finalRating]}
              </span>
            </div>
            <select
              value={finalRating}
              disabled={isLocked}
              onChange={(e) => setFinalRating(e.target.value as BumnRating)}
              className="w-full text-xs bg-slate-50 border border-border-subtle rounded-lg px-3 py-2 text-primary-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 font-bold cursor-pointer"
            >
              <option value="AAA">AAA (Skor Konversi: 100) - Sangat Sehat (Prima)</option>
              <option value="AA">AA (Skor Konversi: 90) - Sangat Sehat</option>
              <option value="A">A (Skor Konversi: 79) - Sehat</option>
              <option value="BBB">BBB (Skor Konversi: 67) - Cukup Sehat</option>
              <option value="BB">BB (Skor Konversi: 56) - Kurang Sehat</option>
              <option value="B">B (Skor Konversi: 44) - Kurang Sehat</option>
              <option value="CCC">CCC (Skor Konversi: 33) - Tidak Sehat</option>
              <option value="D">D / C (Skor Konversi: 10) - Sangat Tidak Sehat</option>
            </select>
          </div>

          {/* Peringkat Komposit Risiko */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-primary-900">
                2. Peringkat Komposit Risiko (Bobot 50%)
              </label>
              <span className="text-xs font-bold text-brand-blue-700">
                Skor: {compositeConversionMap[compositeRating]}
              </span>
            </div>
            <select
              value={compositeRating}
              disabled={isLocked}
              onChange={(e) => setCompositeRating(Number(e.target.value))}
              className="w-full text-xs bg-slate-50 border border-border-subtle rounded-lg px-3 py-2 text-primary-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 font-bold cursor-pointer"
            >
              <option value={1}>Peringkat 1 (Low / Sangat Rendah - Skor 100)</option>
              <option value={2}>Peringkat 2 (Low to Moderate / Rendah - Skor 78)</option>
              <option value={3}>Peringkat 3 (Moderate / Moderat - Skor 55)</option>
              <option value={4}>Peringkat 4 (Moderate to High / Cukup Tinggi - Skor 33)</option>
              <option value={5}>Peringkat 5 (High / Sangat Tinggi - Skor 10)</option>
            </select>
          </div>

          {/* KPMR Score Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-primary-900">
              3. Skor Kualitas Penerapan Manajemen Risiko (KPMR - Rentang 0 s.d. 100)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={kpmrScore}
              disabled={isLocked}
              onChange={(e) => setKpmrScore(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* SPI Review Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-primary-900">
              Catatan Reviu Satuan Pengawas Intern (SPI) / Asesor
            </label>
            <textarea
              rows={3}
              placeholder="Catatan konfirmasi laporan audit SPI dan dasar pertimbangan peringkat komposit..."
              value={spiReviewNotes}
              disabled={isLocked}
              onChange={(e) => setSpiReviewNotes(e.target.value)}
              className="w-full text-xs bg-white border border-border-subtle rounded-lg p-2.5 text-primary-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
            />
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200 flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-200 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isLocked || saving}
              className="text-xs shadow-xs font-bold"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? 'Menyimpan...' : 'Simpan Evaluasi Kinerja'}
            </Button>
          </div>
        </form>

        {/* Right (5 Cols): Live Calculation & Final RMI */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm space-y-5">
            <h4 className="text-sm font-bold text-primary-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Hasil Komputasi Aspek Kinerja</span>
              <Scale className="h-4 w-4 text-slate-400" />
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Komponen Rating (50%):</span>
                <span className="font-bold text-primary-900">
                  {liveCalculation.ratingScore} &times; 50% = {(liveCalculation.ratingScore * 0.5).toFixed(1)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Komponen Komposit (50%):</span>
                <span className="font-bold text-primary-900">
                  {liveCalculation.compositeScore} &times; 50% = {(liveCalculation.compositeScore * 0.5).toFixed(1)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 bg-slate-50 px-3 rounded-lg font-bold">
                <span className="text-primary-900">Total Skor Aspek Kinerja:</span>
                <span className="text-brand-blue-700 text-sm">
                  {liveCalculation.rawPerformanceScore} / 100
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Faktor Penyesuaian Skor:</span>
                <span
                  className={`font-extrabold text-sm ${
                    liveCalculation.penalty < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {liveCalculation.penalty === 0
                    ? '0.00 (Tanpa Penalti)'
                    : `${liveCalculation.penalty.toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Final RMI Result Box */}
            <div className="p-5 bg-gradient-to-r from-brand-blue-900 to-slate-900 text-white rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-brand-blue-200 uppercase tracking-wider block">
                Skor Akhir Risk Maturity Index (RMI)
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-white">
                  {liveCalculation.calculatedFinalRmi.toFixed(2)}
                </span>
                <span className="text-xs text-brand-blue-300">/ 5.00</span>
              </div>

              <div className="pt-2 border-t border-brand-blue-800/80">
                <span className="text-[10px] text-slate-400 block">Fase Tingkat Kematangan Risiko:</span>
                <span className="text-xs font-bold text-emerald-400">
                  {liveCalculation.maturityPhase}
                </span>
              </div>
            </div>

            {/* Official Penalty Reference Table */}
            <div className="text-[11px] text-slate-500 space-y-1.5 pt-2">
              <span className="font-bold text-slate-700 block">Tabel Penalti Kinerja KBUMN:</span>
              <ul className="space-y-0.5 list-disc pl-4 text-[10px]">
                <li>Skor Kinerja &le; 50: Penyesuaian <strong>-1.00</strong></li>
                <li>50 &lt; Skor &le; 65: Penyesuaian <strong>-0.75</strong></li>
                <li>65 &lt; Skor &le; 80: Penyesuaian <strong>-0.50</strong></li>
                <li>80 &lt; Skor &le; 90: Penyesuaian <strong>-0.25</strong></li>
                <li>Skor Kinerja &gt; 90: Penyesuaian <strong>0.00</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
