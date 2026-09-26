'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AiRecommendationDrawer, AiAssistData } from './AiRecommendationDrawer';
import {
  FileText,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Lock,
  Eye,
  Camera,
  Layers,
  Search,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  FileCode,
  ShieldAlert,
} from 'lucide-react';

interface CriterionEvidence {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  docNumber?: string;
  effectiveDate?: string;
  sectionNotes?: string;
  createdAt: string;
}

interface CriterionEvaluation {
  id?: string;
  score: number;
  reviewNotes?: string;
  findingsGap?: string;
  interviewNotes?: string;
  screenshotUrl?: string;
  assessorNotes?: string;
}

interface ParameterCriterion {
  id: number;
  letterCode: string;
  level: number;
  statement: string;
  guidanceNotes: string | null;
  defaultEvidences: string | null;
  evidences: CriterionEvidence[];
  evaluation: CriterionEvaluation | null;
}

interface ParameterDetail {
  id: number;
  code: string;
  parameterNumber: number;
  title: string;
  subDimension: {
    id: number;
    code: string;
    name: string;
    dimension: {
      id: number;
      code: string;
      name: string;
    };
  };
  criteria: ParameterCriterion[];
  calculatedScore?: number;
}

interface ParameterListItem {
  id: number;
  code: string;
  title: string;
  parameterNumber: number;
  calculatedScore: number | null;
  isEvaluated: boolean;
}

interface ParameterMatrixWorkspaceProps {
  periodId: string;
  isLocked?: boolean;
}

export function ParameterMatrixWorkspace({ periodId, isLocked = false }: ParameterMatrixWorkspaceProps) {
  const [parameterList, setParameterList] = useState<ParameterListItem[]>([]);
  const [selectedParamCode, setSelectedParamCode] = useState<string>('P01');
  const [paramDetail, setParamDetail] = useState<ParameterDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State per Criterion (Mapped by criterionId)
  const [evalForm, setEvalForm] = useState<Record<number, CriterionEvaluation>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Right Panel Viewer State
  const [selectedEvidence, setSelectedEvidence] = useState<CriterionEvidence | null>(null);
  const [viewerTab, setViewerTab] = useState<'evidence' | 'supplementary'>('evidence');
  const [supplementaryDocs, setSupplementaryDocs] = useState<any[]>([]);
  const [loadingSuppDocs, setLoadingSuppDocs] = useState(false);
  const [isViewerExpanded, setIsViewerExpanded] = useState(false);

  // AI Recommendation Drawer State
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [aiData, setAiData] = useState<AiAssistData | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Search Parameter
  const [searchParam, setSearchParam] = useState('');

  // 1. Fetch Parameter Matrix List
  const fetchMatrix = async () => {
    setLoadingList(true);
    try {
      const res = await api.get(`/consultant/evaluations/matrix?periodId=${periodId}`);
      if (res.data?.success) {
        const dimensions = res.data.data.dimensions || [];
        const flatParams: ParameterListItem[] = [];

        dimensions.forEach((dim: any) => {
          dim.subDimensions?.forEach((sd: any) => {
            sd.parameters?.forEach((p: any) => {
              flatParams.push({
                id: p.id,
                code: p.code,
                title: p.title,
                parameterNumber: p.parameterNumber,
                calculatedScore: p.calculatedScore,
                isEvaluated: p.isEvaluated,
              });
            });
          });
        });

        setParameterList(flatParams);

        if (flatParams.length > 0 && !flatParams.some((p) => p.code === selectedParamCode)) {
          setSelectedParamCode(flatParams[0].code);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat matriks evaluasi.');
    } finally {
      setLoadingList(false);
    }
  };

  // 2. Fetch Selected Parameter Details
  const fetchParamDetail = async (paramCode: string) => {
    setLoadingDetail(true);
    setError(null);
    setSaveSuccessMsg(null);
    try {
      const res = await api.get(
        `/consultant/evaluations/parameter/${paramCode}?periodId=${periodId}`
      );
      if (res.data?.success) {
        const raw = res.data.data;
        const p = raw.parameter || raw;
        const criteria = raw.criteria || p.criteria || [];

        const dimName =
          typeof p.dimension === 'string'
            ? p.dimension
            : p.subDimension?.dimension?.name || p.dimension?.name || '';
        const subDimName =
          typeof p.subDimension === 'string'
            ? p.subDimension
            : p.subDimension?.name || '';

        const detail: ParameterDetail = {
          id: p.id,
          code: p.code,
          parameterNumber: p.parameterNumber,
          title: p.title,
          subDimension: {
            id: p.subDimension?.id || 0,
            code: p.subDimension?.code || '',
            name: subDimName,
            dimension: {
              id: p.subDimension?.dimension?.id || 0,
              code: p.subDimension?.dimension?.code || '',
              name: dimName,
            },
          },
          criteria,
          calculatedScore: p.currentScore ?? p.calculatedScore ?? undefined,
        };

        setParamDetail(detail);

        // Populate initial form state from existing evaluations
        const initialForm: Record<number, CriterionEvaluation> = {};
        detail.criteria.forEach((crit) => {
          initialForm[crit.id] = {
            score: crit.evaluation?.score || crit.level, // default to level if empty
            reviewNotes: crit.evaluation?.reviewNotes || '',
            findingsGap: crit.evaluation?.findingsGap || '',
            interviewNotes: crit.evaluation?.interviewNotes || '',
            screenshotUrl: crit.evaluation?.screenshotUrl || '',
            assessorNotes: crit.evaluation?.assessorNotes || '',
          };
        });

        setEvalForm(initialForm);
        setIsDirty(false);

        // Auto-select first evidence if available
        const allEvidences = detail.criteria.flatMap((c) => c.evidences || []);
        if (allEvidences.length > 0) {
          setSelectedEvidence(allEvidences[0]);
        } else {
          setSelectedEvidence(null);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat detail parameter penilaian.');
    } finally {
      setLoadingDetail(false);
    }
  };

  // 3. Fetch Supplementary Docs for Right Panel Tab
  const fetchSupplementaryDocs = async () => {
    setLoadingSuppDocs(true);
    try {
      const res = await api.get(`/counterpart/supplementary-documents?periodId=${periodId}`);
      if (res.data?.success) {
        setSupplementaryDocs(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setLoadingSuppDocs(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
    fetchSupplementaryDocs();
  }, [periodId]);

  useEffect(() => {
    if (selectedParamCode) {
      fetchParamDetail(selectedParamCode);
    }
  }, [selectedParamCode, periodId]);

  // Live Weakest-Link Score Calculation
  const liveParameterScore = useMemo(() => {
    if (!paramDetail || !paramDetail.criteria || paramDetail.criteria.length === 0) return 1;
    const scores = (paramDetail.criteria || []).map((c) => evalForm[c.id]?.score || 1);
    return Math.min(...scores);
  }, [paramDetail, evalForm]);

  const handleScoreChange = (criterionId: number, score: number) => {
    if (isLocked) return;
    setEvalForm((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        score,
      },
    }));
    setIsDirty(true);
  };

  const handleFieldChange = (
    criterionId: number,
    field: keyof CriterionEvaluation,
    value: string
  ) => {
    if (isLocked) return;
    setEvalForm((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        [field]: value,
      },
    }));
    setIsDirty(true);
  };

  // Batch Save All Criteria Evaluations
  const handleBatchSave = async () => {
    if (!paramDetail || isLocked) return;

    setSavingBatch(true);
    setError(null);
    setSaveSuccessMsg(null);

    try {
      const evaluationsPayload = (paramDetail.criteria || []).map((crit) => {
        const f = evalForm[crit.id] || { score: crit.level };
        return {
          criterionId: crit.id,
          score: f.score,
          reviewNotes: f.reviewNotes?.trim() || null,
          findingsGap: f.findingsGap?.trim() || null,
          interviewNotes: f.interviewNotes?.trim() || null,
          screenshotUrl: f.screenshotUrl?.trim() || null,
          assessorNotes: f.assessorNotes?.trim() || null,
        };
      });

      await api.post('/consultant/evaluations/batch', {
        periodId,
        evaluations: evaluationsPayload,
      });

      setIsDirty(false);
      setSaveSuccessMsg('Evaluasi parameter & aturan weakest-link berhasil disimpan.');
      await fetchMatrix();
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || err.message || 'Gagal menyimpan evaluasi kriteria.'
      );
    } finally {
      setSavingBatch(false);
    }
  };

  // Open AI Recommendation Drawer
  const handleOpenAiDrawer = async () => {
    setIsAiDrawerOpen(true);
    setLoadingAi(true);
    setAiData(null);

    try {
      const res = await api.post(`/consultant/ai-assist/${selectedParamCode}`, {
        periodId,
      });

      if (res.data?.success) {
        setAiData(res.data.data);
      }
    } catch (err: any) {
      console.warn('AI assist fetch error:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  // Parameter Navigation Helpers
  const currentIndex = parameterList.findIndex((p) => p.code === selectedParamCode);
  const prevParam = currentIndex > 0 ? parameterList[currentIndex - 1] : null;
  const nextParam = currentIndex < parameterList.length - 1 ? parameterList[currentIndex + 1] : null;

  const filteredParamList = useMemo(() => {
    if (!searchParam.trim()) return parameterList;
    const q = searchParam.toLowerCase();
    return parameterList.filter((p) => p.code.toLowerCase().includes(q) || p.title.toLowerCase().includes(q));
  }, [parameterList, searchParam]);

  return (
    <div className="space-y-4">
      {/* Parameter Quick Switcher & Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-border-subtle shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => prevParam && setSelectedParamCode(prevParam.code)}
            disabled={!prevParam || loadingDetail}
            className="text-xs h-8 px-2.5"
            title="Parameter Sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <select
            value={selectedParamCode}
            onChange={(e) => setSelectedParamCode(e.target.value)}
            disabled={loadingDetail}
            className="bg-slate-50 border border-border-subtle rounded-lg px-3 py-1.5 text-xs font-bold text-primary-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 w-full sm:w-80 cursor-pointer"
          >
            {parameterList.map((p) => (
              <option key={p.id} value={p.code}>
                {p.code} - {p.title} {p.calculatedScore ? `(Skor: ${p.calculatedScore})` : ''}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => nextParam && setSelectedParamCode(nextParam.code)}
            disabled={!nextParam || loadingDetail}
            className="text-xs h-8 px-2.5"
            title="Parameter Selanjutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Skor Weakest-Link:</span>
            <span className="text-sm font-extrabold text-white bg-brand-blue-700 px-3 py-1 rounded-lg border border-brand-blue-800 shadow-xs">
              {liveParameterScore}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAiDrawer}
            disabled={isLocked}
            className="border-purple-300 text-purple-800 hover:bg-purple-50 font-bold text-xs h-8"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
            AI Help (DeepSeek)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleBatchSave}
            disabled={isLocked || savingBatch || !isDirty}
            className="text-xs h-8 shadow-xs font-bold whitespace-nowrap"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {savingBatch ? 'Menyimpan...' : isDirty ? 'Simpan Perubahan *' : 'Tersimpan'}
          </Button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-200 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Split-Screen Reviewer: Left (60%) / Right (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side (60% / 7 Cols): Evaluation Form & Criteria Scoring */}
        <div className={`space-y-4 ${isViewerExpanded ? 'hidden' : 'lg:col-span-7'}`}>
          {loadingDetail || !paramDetail ? (
            <div className="bg-white rounded-xl border border-border-subtle p-16 text-center text-xs text-slate-400">
              Memuat lembar kerja evaluasi parameter...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Parameter Heading Card */}
              <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm space-y-2">
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono text-xs font-bold bg-brand-blue-50 text-brand-blue-700 px-2.5 py-1 rounded border border-brand-blue-200">
                    {paramDetail.code}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold truncate">
                    {paramDetail.subDimension?.dimension?.name || 'Dimensi'} &bull;{' '}
                    {paramDetail.subDimension?.name || 'Sub-Dimensi'}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-primary-900">{paramDetail.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Evaluasi seluruh kriteria di bawah ini. Sesuai aturan baku KBUMN, nilai parameter dikunci pada skor
                  kriteria terendah (integer 1 s.d. 5).
                </p>
              </div>

              {/* Criteria Evaluation List */}
              <div className="space-y-4">
                {(paramDetail.criteria || []).map((crit) => {
                  const form = evalForm[crit.id] || { score: crit.level };
                  const currentScore = form.score;

                  return (
                    <div
                      key={crit.id}
                      className="bg-white rounded-xl border border-border-subtle shadow-sm p-5 space-y-4 transition-all"
                    >
                      {/* Criterion Header & Score Buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-start space-x-2.5">
                          <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300 shrink-0">
                            {crit.letterCode}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-primary-900">
                              Kriteria {crit.letterCode} (Level {crit.level})
                            </span>
                            <p className="text-xs text-slate-700 font-medium mt-0.5 leading-relaxed">
                              {crit.statement}
                            </p>
                          </div>
                        </div>

                        {/* 1-5 Score Button Group */}
                        <div className="flex items-center space-x-1 shrink-0 self-end sm:self-center">
                          {[1, 2, 3, 4, 5].map((val) => {
                            const isSelected = currentScore === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                disabled={isLocked}
                                onClick={() => handleScoreChange(crit.id, val)}
                                className={`h-8 w-8 rounded-lg text-xs font-extrabold transition-all ${
                                  isSelected
                                    ? 'bg-brand-blue-600 text-white shadow-xs ring-2 ring-brand-blue-300'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Standar Kolom H & I */}
                      {crit.defaultEvidences && (
                        <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                          <span className="font-bold text-slate-700 block">
                            Standar Dokumen Pemenuhan (Kolom H & I):
                          </span>
                          <p className="leading-relaxed">{crit.defaultEvidences}</p>
                        </div>
                      )}

                      {/* Kolom J: Catatan Reviu Dokumen */}
                      <div>
                        <label className="block text-xs font-semibold text-primary-900 mb-1">
                          Catatan Reviu Dokumen (Kolom J SCORE RMI)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Tuliskan justifikasi reviu kesesuaian dokumen bukti..."
                          value={form.reviewNotes || ''}
                          disabled={isLocked}
                          onChange={(e) => handleFieldChange(crit.id, 'reviewNotes', e.target.value)}
                          className="w-full text-xs bg-white border border-border-subtle rounded-lg p-2.5 text-primary-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
                        />
                      </div>

                      {/* Celah Temuan / Gap Analysis */}
                      <div>
                        <label className="block text-xs font-semibold text-primary-900 mb-1">
                          Celah Temuan / Gap Analisis
                        </label>
                        <Input
                          placeholder="Identifikasi gap atau ketidaksesuaian dokumen yang ditemukan..."
                          value={form.findingsGap || ''}
                          disabled={isLocked}
                          onChange={(e) => handleFieldChange(crit.id, 'findingsGap', e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      {/* Kolom K: Catatan Wawancara */}
                      <div>
                        <label className="block text-xs font-semibold text-primary-900 mb-1">
                          Catatan Klarifikasi Wawancara (Kolom K)
                        </label>
                        <Input
                          placeholder="Konfirmasi wawancara dengan Lini 1, Lini 2, atau SPI..."
                          value={form.interviewNotes || ''}
                          disabled={isLocked}
                          onChange={(e) => handleFieldChange(crit.id, 'interviewNotes', e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      {/* Kolom L: Screenshot Embedder */}
                      <div>
                        <label className="block text-xs font-semibold text-primary-900 mb-1 flex items-center space-x-1.5">
                          <Camera className="h-3.5 w-3.5 text-slate-500" />
                          <span>Cuplikan Bukti / Screenshot Embedder (Kolom L)</span>
                        </label>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="https://storage.openrmi.com/screenshots/sk-limit-risiko.png"
                            value={form.screenshotUrl || ''}
                            disabled={isLocked}
                            onChange={(e) => handleFieldChange(crit.id, 'screenshotUrl', e.target.value)}
                            className="text-xs flex-1"
                          />
                          {form.screenshotUrl && (
                            <a
                              href={form.screenshotUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Lihat</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Strict Assessor Confidential Notes */}
                      <div className="bg-purple-50/50 p-3 rounded-lg border border-purple-200 text-xs space-y-1">
                        <div className="flex items-center space-x-1.5 font-bold text-purple-900">
                          <Lock className="h-3.5 w-3.5 text-purple-700" />
                          <span>Catatan Internal Asesor (Strict Confidentiality - Tersembunyi dari Klien)</span>
                        </div>
                        <Input
                          placeholder="Catatan rahasia khusus pertimbangan internal tim penilai independen..."
                          value={form.assessorNotes || ''}
                          disabled={isLocked}
                          onChange={(e) => handleFieldChange(crit.id, 'assessorNotes', e.target.value)}
                          className="text-xs bg-white"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side (40% / 5 Cols): Integrated Document & Evidence Viewer */}
        <div className={`space-y-4 ${isViewerExpanded ? 'col-span-12' : 'lg:col-span-5'}`}>
          <div className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden flex flex-col sticky top-20">
            {/* Viewer Top Toolbar */}
            <div className="px-4 py-3 bg-slate-50 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setViewerTab('evidence')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewerTab === 'evidence'
                      ? 'bg-white text-primary-900 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-primary-900'
                  }`}
                >
                  Berkas Eviden ({paramDetail?.criteria.flatMap((c) => c.evidences || []).length || 0})
                </button>
                <button
                  onClick={() => setViewerTab('supplementary')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewerTab === 'supplementary'
                      ? 'bg-white text-primary-900 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-primary-900'
                  }`}
                >
                  Dokumen Pasca-FGD ({supplementaryDocs.length})
                </button>
              </div>

              <button
                onClick={() => setIsViewerExpanded(!isViewerExpanded)}
                className="p-1 text-slate-500 hover:text-primary-900 rounded"
                title={isViewerExpanded ? 'Perkecil Layar' : 'Perluas Layar Viewer'}
              >
                {isViewerExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Document List Selection */}
            <div className="p-3 bg-slate-50/50 border-b border-slate-100 max-h-48 overflow-y-auto space-y-2">
              {viewerTab === 'evidence' ? (
                (() => {
                  const evidences = paramDetail?.criteria.flatMap((c) => c.evidences || []) || [];
                  if (evidences.length === 0) {
                    return (
                      <p className="text-xs text-slate-400 text-center py-4">
                        Counterpart belum mengunggah berkas bukti untuk parameter ini.
                      </p>
                    );
                  }

                  return evidences.map((evi) => {
                    const isSelected = selectedEvidence?.id === evi.id;
                    return (
                      <div
                        key={evi.id}
                        onClick={() => setSelectedEvidence(evi)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-start space-x-2.5 ${
                          isSelected
                            ? 'bg-brand-blue-50/80 border-brand-blue-300 text-brand-blue-900'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <FileText className="h-4 w-4 text-brand-blue-600 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate text-xs">{evi.fileName}</p>
                          <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                            {evi.docNumber && <span>No: {evi.docNumber}</span>}
                            {evi.sectionNotes && <span>Hal: {evi.sectionNotes}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                (() => {
                  if (supplementaryDocs.length === 0) {
                    return (
                      <p className="text-xs text-slate-400 text-center py-4">
                        Belum ada dokumen tambahan pasca-FGD.
                      </p>
                    );
                  }

                  return supplementaryDocs.map((doc) => {
                    const isSelected = selectedEvidence?.id === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() =>
                          setSelectedEvidence({
                            id: doc.id,
                            fileName: doc.fileName,
                            fileUrl: doc.fileUrl,
                            createdAt: doc.createdAt,
                          })
                        }
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-start space-x-2.5 ${
                          isSelected
                            ? 'bg-purple-50/80 border-purple-300 text-purple-900'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <FileCode className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate text-xs">{doc.fileName}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                            {doc.category} &bull; {doc.description || 'Tidak ada deskripsi'}
                          </p>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            {/* Document Preview Area */}
            <div className="p-4 flex-1 min-h-[480px] flex flex-col bg-slate-900/5">
              {selectedEvidence ? (
                <div className="flex-1 flex flex-col space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                    <span className="font-bold text-primary-900 truncate max-w-xs">
                      {selectedEvidence.fileName}
                    </span>
                    <a
                      href={selectedEvidence.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-blue-700 hover:underline flex items-center space-x-1 font-semibold"
                    >
                      <span>Buka Tab Baru</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {/* Embedded Viewer (iframe for PDF / image preview) */}
                  <div className="flex-1 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center min-h-[400px]">
                    {selectedEvidence.fileName.toLowerCase().endsWith('.png') ||
                    selectedEvidence.fileName.toLowerCase().endsWith('.jpg') ||
                    selectedEvidence.fileName.toLowerCase().endsWith('.jpeg') ? (
                      <img
                        src={selectedEvidence.fileUrl}
                        alt={selectedEvidence.fileName}
                        className="max-h-[500px] w-auto object-contain p-2"
                      />
                    ) : (
                      <iframe
                        src={selectedEvidence.fileUrl}
                        title={selectedEvidence.fileName}
                        className="w-full h-[520px] border-0"
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-center p-8">
                  <FileText className="h-12 w-12 text-slate-300" />
                  <h4 className="text-xs font-bold text-primary-900">Pilih Berkas Dokumen untuk Pratinjau</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Klik salah satu dokumen eviden di atas untuk memeriksa isi dokumen langsung di panel ini.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendation Drawer */}
      <AiRecommendationDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        periodId={periodId}
        parameterCode={selectedParamCode}
        aiData={aiData}
        loading={loadingAi}
        onApplySuccess={() => fetchParamDetail(selectedParamCode)}
      />
    </div>
  );
}
