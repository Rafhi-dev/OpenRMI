'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  X,
  CheckCircle2,
  FileText,
  AlertCircle,
  BrainCircuit,
  Bookmark,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface CriterionRecommendation {
  criterionId: number;
  letterCode: string;
  level: number;
  recommendedScore: number;
  evidenceQuote: string;
  pageNumber?: number | string;
  fileName?: string;
  reviewNarrative: string;
  gapAnalysis?: string;
}

export interface AiAssistData {
  id?: string;
  parameterCode: string;
  parameterTitle: string;
  recommendedParameterScore: number;
  thinkingProcess?: string;
  criteriaRecommendations: CriterionRecommendation[];
  isApplied?: boolean;
}

interface AiRecommendationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  periodId: string;
  parameterCode: string;
  aiData: AiAssistData | null;
  loading: boolean;
  onApplySuccess: () => void;
}

export function AiRecommendationDrawer({
  isOpen,
  onClose,
  periodId,
  parameterCode,
  aiData,
  loading,
  onApplySuccess,
}: AiRecommendationDrawerProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [showThinking, setShowThinking] = useState(true);

  if (!isOpen) return null;

  const handleApply = async () => {
    if (!aiData?.id) {
      // Jika recommendationId tidak tersedia, buat notifikasi
      alert('Rekomendasi belum memiliki ID tercatat di database.');
      return;
    }

    setIsApplying(true);
    setApplyError(null);

    try {
      await api.post('/consultant/ai-assist/apply', {
        periodId,
        parameterCode,
        recommendationId: aiData.id,
        applyNotes: 'Diterapkan oleh Konsultan via One-Click Apply',
      });

      onApplySuccess();
      onClose();
    } catch (err: any) {
      setApplyError(
        err.response?.data?.error?.message || err.message || 'Gagal menerapkan rekomendasi AI ke lembar kerja.'
      );
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-purple-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-600/30 text-purple-300 rounded-lg border border-purple-500/40">
              <Sparkles className="h-5 w-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white">Rekomendasi Cerdas DeepSeek LLM</h3>
                <Badge variant="primary" className="text-[10px] bg-purple-500/30 text-purple-200 border-purple-400">
                  RAG Semantic Search
                </Badge>
              </div>
              <p className="text-xs text-purple-200">
                Parameter <span className="font-bold text-white font-mono">{parameterCode}</span> &bull; Weakest-Link Compliance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <BrainCircuit className="h-12 w-12 text-purple-600 animate-pulse" />
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-purple-500 rounded-full animate-ping" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-primary-900">Menganalisis Dokumen Bukti...</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  DeepSeek sedang mencocokkan potongan bukti semantik terhadap standar kriteria Juknis KBUMN
                </p>
              </div>
            </div>
          ) : !aiData ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-primary-900">Rekomendasi Belum Tersedia</h4>
              <p className="text-xs text-slate-500">
                Pastikan Tim Counterpart telah mengunggah dokumen bukti dukung pada parameter ini.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Score Card */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wide">
                    Rekomendasi Skor Parameter (Weakest-Link)
                  </span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-2xl font-extrabold text-purple-900">
                      Skor {aiData.recommendedParameterScore}
                    </span>
                    <span className="text-xs text-purple-700">/ 5.0 (Integer Baku)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Ditentukan dari kriteria bernilai terendah sesuai aturan baku KBUMN
                  </p>
                </div>

                <div className="text-right">
                  <Badge variant={aiData.isApplied ? 'success' : 'outline'} className="text-xs">
                    {aiData.isApplied ? 'Sudah Diterapkan' : 'Belum Diterapkan'}
                  </Badge>
                </div>
              </div>

              {/* Thinking Process / Chain-of-Thought (Collapsible) */}
              {aiData.thinkingProcess && (
                <div className="bg-slate-900 text-slate-200 rounded-xl overflow-hidden border border-slate-800">
                  <button
                    onClick={() => setShowThinking(!showThinking)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center space-x-2 text-xs font-bold text-purple-300">
                      <BrainCircuit className="h-4 w-4 text-purple-400" />
                      <span>Alur Penalaran Berantai (Chain-of-Thought / Audit Trail)</span>
                    </div>
                    {showThinking ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {showThinking && (
                    <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-xs font-mono leading-relaxed text-slate-300 whitespace-pre-wrap max-h-56 overflow-y-auto">
                      {aiData.thinkingProcess}
                    </div>
                  )}
                </div>
              )}

              {/* Criteria Recommendations List */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Rekomendasi Nilai & Kutipan Eviden Per Kriteria
                </h4>

                {aiData.criteriaRecommendations.map((crit, idx) => (
                  <div
                    key={crit.criterionId || idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300">
                          Kriteria {crit.letterCode}
                        </span>
                        <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          Level {crit.level}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs text-slate-500 font-medium">Skor Rekomendasi:</span>
                        <span className="text-xs font-extrabold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-300">
                          {crit.recommendedScore}
                        </span>
                      </div>
                    </div>

                    {/* Verbatim Quote & Page Ref */}
                    {crit.evidenceQuote && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700">
                          <Bookmark className="h-3.5 w-3.5 text-purple-600" />
                          <span>Kutipan Bukti Verbatim:</span>
                          {crit.pageNumber && (
                            <span className="text-purple-700 font-bold ml-1">
                              (Halaman {crit.pageNumber})
                            </span>
                          )}
                          {crit.fileName && (
                            <span className="text-slate-500 font-normal truncate">
                              &bull; {crit.fileName}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 italic leading-relaxed pl-5 border-l-2 border-purple-400">
                          &quot;{crit.evidenceQuote}&quot;
                        </p>
                      </div>
                    )}

                    {/* Review Narrative */}
                    {crit.reviewNarrative && (
                      <div className="text-xs space-y-0.5">
                        <span className="font-bold text-slate-700">Draf Catatan Reviu (Kolom J):</span>
                        <p className="text-slate-600 leading-relaxed">{crit.reviewNarrative}</p>
                      </div>
                    )}

                    {/* Gap Analysis */}
                    {crit.gapAnalysis && (
                      <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200 text-xs text-amber-900 leading-relaxed">
                        <span className="font-bold text-amber-800 block mb-0.5">Celah Temuan:</span>
                        {crit.gapAnalysis}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer with One-Click Apply */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
          {applyError && (
            <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{applyError}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 max-w-sm">
              <span className="font-bold text-slate-700">Human-in-the-Loop:</span> Anda tetap dapat mengedit skor
              dan narasi setelah menerapkan rekomendasi AI.
            </p>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isApplying}>
                Tutup
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApply}
                disabled={isApplying || !aiData}
                className="bg-purple-700 hover:bg-purple-800 text-white shadow-xs font-semibold text-xs"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                {isApplying ? 'Menerapkan...' : 'Terapkan Rekomendasi (One-Click Apply)'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
