'use client';

import React from 'react';
import { Users, FileCheck, Scale, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface PerceptionGapChartProps {
  assessorD1Score: number | null;
  employeeSurveyScore: number | null;
  totalResponses: number;
  delta: number | null;
  gapCategory: 'OVERCONFIDENT' | 'ALIGNED' | 'NEEDS_EDUCATION' | 'NOT_APPLICABLE' | string;
  gapCategoryLabel: string;
  interpretation: string;
}

export function PerceptionGapChart({
  assessorD1Score,
  employeeSurveyScore,
  totalResponses,
  delta,
  gapCategory,
  gapCategoryLabel,
  interpretation,
}: PerceptionGapChartProps) {
  const assessorVal = assessorD1Score ?? 0;
  const surveyVal = employeeSurveyScore ?? 0;

  const assessorPct = Math.min(100, Math.max(0, (assessorVal / 5) * 100));
  const surveyPct = Math.min(100, Math.max(0, (surveyVal / 5) * 100));

  const getCategoryBadgeClass = () => {
    switch (gapCategory) {
      case 'OVERCONFIDENT':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'ALIGNED':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'NEEDS_EDUCATION':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const formatScore = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '-';
    return Number(val).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Side-by-Side Visual Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assessor D1 Score */}
        <div className="bg-white p-5 rounded-2xl border border-border-subtle shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
            <FileCheck className="h-4 w-4 text-brand-blue-600" />
            <span>Skor Faktual Asesor (Dimensi 1: Budaya Risiko)</span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-primary-900">
              {formatScore(assessorD1Score)}
            </span>
            <span className="text-xs text-slate-400">/ 5.00</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-brand-blue-600 h-3 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${assessorPct}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-500">
            Berdasarkan pembuktian dokumen kebijakan, SOP, dan wawancara terstruktur.
          </p>
        </div>

        {/* Employee Survey Score */}
        <div className="bg-white p-5 rounded-2xl border border-border-subtle shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
            <Users className="h-4 w-4 text-emerald-600" />
            <span>Skor Persepsi Mandiri Karyawan (Hasil Kuesioner)</span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-700">
              {formatScore(employeeSurveyScore)}
            </span>
            <span className="text-xs text-slate-400">/ 5.00</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-3 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${surveyPct}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-500">
            Agregasi dari <strong>{totalResponses}</strong> responden karyawan anonim.
          </p>
        </div>
      </div>

      {/* Delta and Interpretation Card */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div className="flex items-center space-x-2">
            <Scale className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-700">
              Kesenjangan Persepsi (&Delta; = Skor Survei - Skor Asesor)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-extrabold text-primary-900">
              {delta !== null && delta !== undefined
                ? Number(delta) > 0
                  ? `+${Number(delta).toFixed(2)}`
                  : Number(delta).toFixed(2)
                : '-'}
            </span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass()}`}>
              {gapCategoryLabel}
            </span>
          </div>
        </div>

        <div className="flex items-start space-x-2.5 text-xs text-slate-700 leading-relaxed">
          <Info className="h-4 w-4 text-brand-blue-600 shrink-0 mt-0.5" />
          <p>{interpretation}</p>
        </div>
      </div>
    </div>
  );
}
