'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface DimensionDeltaItem {
  current: number | null;
  previous: number;
  delta: number | null;
  trend: 'INCREASE' | 'DECREASE' | 'STAGNANT';
}

interface GroupedBarChartYoYProps {
  currentYear: number;
  previousYear: number;
  dimensionDeltas: Record<string, DimensionDeltaItem>;
}

export function GroupedBarChartYoY({
  currentYear,
  previousYear,
  dimensionDeltas,
}: GroupedBarChartYoYProps) {
  const dimensionTitles: Record<string, string> = {
    D1: 'Budaya & Kapabilitas Risiko',
    D2: 'Organisasi & Tata Kelola',
    D3: 'Kerangka Risiko & Kepatuhan',
    D4: 'Proses & Kontrol Risiko',
    D5: 'Model, Data & Teknologi',
  };

  const dimensionKeys = ['D1', 'D2', 'D3', 'D4', 'D5'];

  const formatScore = (val: number | null | undefined, fallback = 'Draf') => {
    if (val === null || val === undefined || isNaN(Number(val))) return fallback;
    return Number(val).toFixed(2);
  };

  const deltas = dimensionDeltas || {};

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center justify-end space-x-6 text-xs font-semibold pb-2 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 bg-emerald-600 rounded-sm" />
          <span className="text-slate-800">Tahun Berjalan ({currentYear})</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 bg-slate-400 rounded-sm" />
          <span className="text-slate-500">Tahun Sebelumnya ({previousYear})</span>
        </div>
      </div>

      {/* Grouped Bars */}
      <div className="space-y-4 pt-1">
        {dimensionKeys.map((code) => {
          const item = deltas[code] || {
            current: null,
            previous: 0,
            delta: null,
            trend: 'STAGNANT',
          };
          const currentVal = item.current ?? 0;
          const previousVal = item.previous ?? 0;
          const delta = item.delta;

          const currentPct = Math.min(100, Math.max(0, (currentVal / 5) * 100));
          const previousPct = Math.min(100, Math.max(0, (previousVal / 5) * 100));

          return (
            <div key={code} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    {code}
                  </span>
                  <span className="font-bold text-primary-900">{dimensionTitles[code] || code}</span>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-slate-500 text-[11px]">
                    Lalu: <strong className="text-slate-700">{formatScore(previousVal, '0.00')}</strong>
                  </span>
                  <span className="text-emerald-700 text-xs">
                    Kini: <strong>{formatScore(item.current, 'Draf')}</strong>
                  </span>

                  {delta !== null && delta !== undefined && !isNaN(Number(delta)) && (
                    <span
                      className={`inline-flex items-center space-x-0.5 text-[11px] font-bold px-2 py-0.5 rounded ${
                        Number(delta) > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : Number(delta) < 0
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {Number(delta) > 0 ? (
                        <TrendingUp className="h-3 w-3 text-emerald-700" />
                      ) : Number(delta) < 0 ? (
                        <TrendingDown className="h-3 w-3 text-rose-700" />
                      ) : (
                        <Minus className="h-3 w-3 text-slate-600" />
                      )}
                      <span>
                        {Number(delta) > 0
                          ? `+${Number(delta).toFixed(2)}`
                          : Number(delta).toFixed(2)}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Dual Visual Bar */}
              <div className="space-y-1.5 pt-1">
                {/* Current Year Bar */}
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-400 font-semibold w-14 shrink-0">
                    {currentYear}
                  </span>
                  <div className="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-3 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${currentPct}%` }}
                    />
                  </div>
                </div>

                {/* Previous Year Bar */}
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-400 font-semibold w-14 shrink-0">
                    {previousYear}
                  </span>
                  <div className="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-slate-400 h-3 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${previousPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
