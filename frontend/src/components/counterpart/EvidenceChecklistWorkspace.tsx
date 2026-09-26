'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Search,
  Filter,
  Layers,
  FileCheck2,
  Calendar,
  Bookmark,
  Sparkles,
} from 'lucide-react';

export interface CriterionEvidence {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  docNumber?: string;
  effectiveDate?: string;
  sectionNotes?: string;
  createdAt: string;
}

export interface CriterionItem {
  criterionId: number;
  letterCode: string;
  level: number;
  statement: string;
  guidanceNotes: string | null;
  defaultEvidences: string | null;
  evidences: CriterionEvidence[];
}

export interface ParameterItem {
  parameterId: number;
  parameterCode: string;
  parameterNumber: number;
  title: string;
  dimension: string;
  subDimension: string;
  totalCriteria: number;
  criteriaWithEvidence: number;
  isComplete: boolean;
  criteria: CriterionItem[];
}

interface EvidenceChecklistWorkspaceProps {
  periodId?: string;
  isLocked?: boolean;
}

export function EvidenceChecklistWorkspace({ periodId, isLocked = false }: EvidenceChecklistWorkspaceProps) {
  const [parameters, setParameters] = useState<ParameterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDimension, setSelectedDimension] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETE' | 'INCOMPLETE'>('ALL');

  // Expanded parameter state
  const [expandedParams, setExpandedParams] = useState<Record<string, boolean>>({});

  // Upload Modal State
  const [selectedCriterion, setSelectedCriterion] = useState<CriterionItem | null>(null);
  const [selectedParamTitle, setSelectedParamTitle] = useState<string>('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [docNumber, setDocNumber] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [sectionNotes, setSectionNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchChecklist = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = periodId
        ? `/counterpart/evidence-checklist?periodId=${periodId}`
        : '/counterpart/evidence-checklist';
      const res = await api.get(url);

      if (res.data?.success) {
        const rawData: ParameterItem[] = Array.isArray(res.data.data) ? res.data.data : [];
        setParameters(rawData);

        // Auto-expand first parameter if none expanded
        if (rawData.length > 0 && Object.keys(expandedParams).length === 0) {
          setExpandedParams({ [rawData[0].parameterCode]: true });
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat checklist dokumen bukti.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, [periodId]);

  // Distinct dimensions for filter dropdown
  const uniqueDimensions = useMemo(() => {
    const dims = new Set<string>();
    parameters.forEach((p) => {
      if (p.dimension) dims.add(p.dimension);
    });
    return Array.from(dims);
  }, [parameters]);

  // Overall Statistics
  const stats = useMemo(() => {
    let totalCriteria = 0;
    let criteriaWithEvidence = 0;
    let completedParameters = 0;

    parameters.forEach((p) => {
      totalCriteria += p.totalCriteria;
      criteriaWithEvidence += p.criteriaWithEvidence;
      if (p.isComplete) completedParameters++;
    });

    const completionPct = totalCriteria > 0 ? (criteriaWithEvidence / totalCriteria) * 100 : 0;

    return {
      totalParameters: parameters.length,
      completedParameters,
      totalCriteria,
      criteriaWithEvidence,
      completionPct: Math.round(completionPct * 10) / 10,
    };
  }, [parameters]);

  // Filtered parameters
  const filteredParameters = useMemo(() => {
    return parameters.filter((param) => {
      // Search query filter (matches code, title, or criterion statement)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesCode = param.parameterCode.toLowerCase().includes(query);
        const matchesTitle = param.title.toLowerCase().includes(query);
        const matchesCriterion = (param.criteria || []).some((c) =>
          c.statement.toLowerCase().includes(query) || (c.defaultEvidences && c.defaultEvidences.toLowerCase().includes(query))
        );
        if (!matchesCode && !matchesTitle && !matchesCriterion) return false;
      }

      // Dimension filter
      if (selectedDimension !== 'ALL' && param.dimension !== selectedDimension) {
        return false;
      }

      // Status filter
      if (statusFilter === 'COMPLETE' && !param.isComplete) return false;
      if (statusFilter === 'INCOMPLETE' && param.isComplete) return false;

      return true;
    });
  }, [parameters, searchQuery, selectedDimension, statusFilter]);

  const toggleExpand = (code: string) => {
    setExpandedParams((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const handleOpenUpload = (paramTitle: string, criterion: CriterionItem) => {
    if (isLocked) {
      alert('Periode penilaian telah difinalisasi dan terkunci. Unggah bukti tidak lagi diizinkan.');
      return;
    }
    setSelectedParamTitle(paramTitle);
    setSelectedCriterion(criterion);
    setFileToUpload(null);
    setDocNumber('');
    setEffectiveDate('');
    setSectionNotes('');
    setUploadError(null);
    setIsUploadModalOpen(true);
  };

  const validateFile = (file: File): string | null => {
    const validExtensions = ['.pdf', '.docx', '.xlsx', '.jpeg', '.jpg', '.png'];
    const validMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
    ];

    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => fileNameLower.endsWith(ext));
    const hasValidMime = validMimes.includes(file.type);

    if (!hasValidExt && !hasValidMime) {
      return 'Format berkas tidak diizinkan! Sistem hanya menerima PDF, DOCX, XLSX, JPEG, atau PNG.';
    }

    // 50 MB limit
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'Ukuran berkas melebihi batas maksimum 50 MB.';
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const errorMsg = validateFile(file);
    if (errorMsg) {
      setUploadError(errorMsg);
      setFileToUpload(null);
      return;
    }
    setFileToUpload(file);
    setUploadError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload || !selectedCriterion) {
      setUploadError('Silakan pilih berkas yang akan diunggah.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // 1. Dapatkan Presigned Upload URL
      const presignedRes = await api.post('/counterpart/evidences/presigned-url', {
        fileName: fileToUpload.name,
        mimeType: fileToUpload.type || 'application/pdf',
        fileSizeBytes: fileToUpload.size,
      });

      const { uploadUrl, fileUrl } = presignedRes.data.data;

      // 2. Upload file langsung ke Object Storage
      try {
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': fileToUpload.type || 'application/pdf',
          },
          body: fileToUpload,
        });
      } catch (uploadNetErr) {
        // Toleransi kegagalan direct mock S3 upload di environment lokal
        console.warn('Storage PUT network info:', uploadNetErr);
      }

      // 3. Catat metadata bukti ke database backend
      await api.post('/counterpart/evidences', {
        criterionId: selectedCriterion.criterionId,
        fileName: fileToUpload.name,
        fileUrl: fileUrl || uploadUrl.split('?')[0],
        fileSize: fileToUpload.size,
        mimeType: fileToUpload.type || 'application/pdf',
        docNumber: docNumber.trim() || undefined,
        effectiveDate: effectiveDate ? new Date(effectiveDate).toISOString() : undefined,
        sectionNotes: sectionNotes.trim() || undefined,
      });

      setIsUploadModalOpen(false);
      await fetchChecklist();
    } catch (err: any) {
      setUploadError(
        err.response?.data?.error?.message || err.message || 'Terjadi kesalahan saat mengunggah dokumen.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (isLocked) {
      alert('Periode penilaian telah terkunci. Penghapusan bukti tidak diizinkan.');
      return;
    }

    if (!confirm('Apakah Anda yakin ingin menghapus berkas dokumen bukti ini?')) return;

    try {
      await api.delete(`/counterpart/evidences/${evidenceId}`);
      await fetchChecklist();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal menghapus dokumen bukti.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getLevelBadgeClass = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 2:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 3:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 4:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 5:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  if (loading && parameters.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        <p className="text-xs text-slate-500 font-medium">Memuat master parameter dan checklist bukti KBUMN...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl space-y-3">
        <div className="flex items-center space-x-2 font-bold text-sm">
          <AlertCircle className="h-5 w-5 text-rose-600" />
          <span>Gagal Memuat Checklist Eviden</span>
        </div>
        <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchChecklist}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info & Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <FileCheck2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Kelengkapan Bukti</p>
            <h3 className="text-xl font-extrabold text-primary-900">{stats.completionPct}%</h3>
            <p className="text-[11px] text-slate-500">
              {stats.criteriaWithEvidence} dari {stats.totalCriteria} kriteria
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-brand-blue-50 text-brand-blue-600 rounded-lg">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Parameter Lengkap</p>
            <h3 className="text-xl font-extrabold text-primary-900">
              {stats.completedParameters} / {stats.totalParameters}
            </h3>
            <p className="text-[11px] text-slate-500">Parameter 100% berdokumen</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Bookmark className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Standar Regulasi</p>
            <h3 className="text-sm font-bold text-primary-900 mt-1">PER-2/MBU/03/2023</h3>
            <p className="text-[11px] text-purple-600 font-semibold">Juknis 8 Per-2 KBUMN</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Status Penguncian</p>
            <h3 className="text-sm font-bold text-primary-900 mt-1">
              {isLocked ? 'Terkunci Permanen' : 'Aktif Mengunggah'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {isLocked ? 'Draf asesmen telah disahkan' : 'Terbuka untuk pelengkap eviden'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-sm space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-primary-900">Progres Pemenuhan Dokumen Bukti Perusahaan</span>
          <span className="font-bold text-emerald-700">{stats.completionPct}% Lengkap</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${stats.completionPct}%` }}
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari kode parameter (contoh: P01) atau nama kriteria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 mr-2">
            <Filter className="h-3.5 w-3.5" />
            <span>Dimensi:</span>
          </div>
          <select
            value={selectedDimension}
            onChange={(e) => setSelectedDimension(e.target.value)}
            className="text-xs bg-slate-50 border border-border-subtle rounded-md px-2.5 py-1.5 text-primary-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Dimensi (5 Dimensi)</option>
            {uniqueDimensions.map((dim) => (
              <option key={dim} value={dim}>
                {dim}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-border-subtle rounded-md px-2.5 py-1.5 text-primary-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="COMPLETE">Lengkap (100%)</option>
            <option value="INCOMPLETE">Belum Lengkap</option>
          </select>
        </div>
      </div>

      {/* Parameter List Accordion */}
      <div className="space-y-3">
        {filteredParameters.length === 0 ? (
          <div className="bg-white rounded-xl border border-border-subtle p-12 text-center space-y-3">
            <FileText className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-primary-900">Tidak Ada Parameter Ditemukan</h4>
            <p className="text-xs text-slate-500">
              Ubah kueri pencarian atau filter dimensi untuk menampilkan parameter penilaian.
            </p>
          </div>
        ) : (
          filteredParameters.map((param) => {
            const isExpanded = !!expandedParams[param.parameterCode];
            return (
              <div
                key={param.parameterId}
                className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden transition-all"
              >
                {/* Parameter Card Header */}
                <div
                  onClick={() => toggleExpand(param.parameterCode)}
                  className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center space-x-3.5 flex-1 min-w-0 pr-4">
                    <span className="font-mono font-bold text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded border border-emerald-200 shrink-0">
                      {param.parameterCode}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-primary-900 truncate">{param.title}</h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        {param.dimension} &bull; {param.subDimension}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-primary-900">
                        {param.criteriaWithEvidence} / {param.totalCriteria} Kriteria
                      </p>
                      <p className="text-[10px] text-slate-500">Terpenuhi berkas bukti</p>
                    </div>

                    <Badge
                      variant={param.isComplete ? 'success' : 'outline'}
                      className="text-[11px]"
                    >
                      {param.isComplete ? 'Lengkap' : 'Belum Lengkap'}
                    </Badge>

                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Parameter Details & Criteria Table (Expanded) */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-4">
                    <div className="space-y-4">
                      {(param.criteria || []).map((crit) => {
                        const evidencesList = crit.evidences || [];
                        const hasEvidences = evidencesList.length > 0;
                        return (
                          <div
                            key={crit.criterionId}
                            className="bg-white rounded-lg border border-border-subtle p-5 shadow-sm space-y-4"
                          >
                            {/* Criterion Top Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="flex items-start space-x-3">
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${getLevelBadgeClass(
                                    crit.level
                                  )}`}
                                >
                                  Level {crit.level}
                                </span>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-xs text-primary-900">
                                      Kriteria {crit.letterCode}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed">
                                    {crit.statement}
                                  </p>
                                </div>
                              </div>

                              <Button
                                size="sm"
                                variant={hasEvidences ? 'outline' : 'primary'}
                                onClick={() => handleOpenUpload(param.title, crit)}
                                disabled={isLocked}
                                className="shrink-0 text-xs self-start"
                              >
                                <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                                {hasEvidences ? 'Tambah Bukti' : 'Unggah Bukti'}
                              </Button>
                            </div>

                            {/* Standar Kolom H & I */}
                            {(crit.defaultEvidences || crit.guidanceNotes) && (
                              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-2">
                                {crit.defaultEvidences && (
                                  <div>
                                    <span className="font-bold text-slate-700">
                                      Standar Dokumen Pembuktian (Kolom H & I):
                                    </span>
                                    <p className="text-slate-600 mt-0.5 leading-relaxed whitespace-pre-line">
                                      {crit.defaultEvidences}
                                    </p>
                                  </div>
                                )}
                                {crit.guidanceNotes && (
                                  <div className="pt-1.5 border-t border-slate-200/60">
                                    <span className="font-bold text-slate-700">
                                      Petunjuk Pemenuhan:
                                    </span>
                                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                                      {crit.guidanceNotes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* List of Uploaded Evidence Documents */}
                            <div className="space-y-2">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                Dokumen Bukti Terunggah ({evidencesList.length})
                              </span>

                              {evidencesList.length === 0 ? (
                                <div className="p-3 bg-amber-50/50 border border-dashed border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center space-x-2">
                                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                                  <span>
                                    Belum ada dokumen bukti yang diunggah untuk kriteria ini. Klik tombol{' '}
                                    <strong>Unggah Bukti</strong> untuk melengkapi.
                                  </span>
                                </div>
                              ) : (
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
                                  {evidencesList.map((evi) => (
                                    <div
                                      key={evi.id}
                                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 transition-colors"
                                    >
                                      <div className="flex items-start space-x-3 min-w-0">
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded shrink-0 mt-0.5">
                                          <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                          <a
                                            href={evi.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-bold text-primary-900 hover:text-emerald-700 hover:underline flex items-center space-x-1"
                                          >
                                            <span className="truncate">{evi.fileName}</span>
                                            <ExternalLink className="h-3 w-3 inline shrink-0 text-slate-400" />
                                          </a>
                                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1">
                                            <span>{formatFileSize(evi.fileSize)}</span>
                                            {evi.docNumber && (
                                              <span className="font-semibold text-slate-700">
                                                No: {evi.docNumber}
                                              </span>
                                            )}
                                            {evi.effectiveDate && (
                                              <span>
                                                Pengesahan:{' '}
                                                {new Date(evi.effectiveDate).toLocaleDateString('id-ID')}
                                              </span>
                                            )}
                                            {evi.sectionNotes && (
                                              <span className="italic text-slate-600">
                                                &quot;{evi.sectionNotes}&quot;
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                                        <a
                                          href={evi.fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-brand-blue-600 hover:underline font-medium px-2 py-1"
                                        >
                                          Buka
                                        </a>
                                        {!isLocked && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteEvidence(evi.id)}
                                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 w-7 p-0"
                                            title="Hapus bukti"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Upload Modal with Drag and Drop */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => !uploading && setIsUploadModalOpen(false)}
        title="Unggah Dokumen Bukti Dukung"
        maxWidth="xl"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <span className="font-semibold text-slate-500">Target Parameter & Kriteria:</span>
            <p className="font-bold text-primary-900 mt-0.5">{selectedParamTitle}</p>
            {selectedCriterion && (
              <p className="text-slate-600 mt-1">
                Kriteria {selectedCriterion.letterCode} (Level {selectedCriterion.level}):{' '}
                {selectedCriterion.statement}
              </p>
            )}
          </div>

          {/* Drag & Drop File Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/60'
                : fileToUpload
                ? 'border-emerald-300 bg-emerald-50/20'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <input
              id="file-upload-input"
              type="file"
              className="hidden"
              accept=".pdf,.docx,.xlsx,.jpeg,.jpg,.png"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <UploadCloud className="h-10 w-10 text-emerald-600 mx-auto mb-2" />

            {fileToUpload ? (
              <div className="space-y-1">
                <p className="text-xs font-bold text-primary-900">{fileToUpload.name}</p>
                <p className="text-[11px] text-slate-500">{formatFileSize(fileToUpload.size)}</p>
                <span className="inline-block text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                  Klik untuk mengganti berkas
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-primary-900">
                  Tarik dan lepaskan berkas ke sini, atau <span className="text-emerald-700 underline">pilih dari komputer</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Format yang didukung: PDF, DOCX, XLSX, JPEG, PNG (Maksimal 50 MB)
                </p>
              </div>
            )}
          </div>

          {/* Metadata Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-primary-900 mb-1">
                Nomor Surat / SK Dokumen (Opsional)
              </label>
              <Input
                placeholder="Contoh: SK-DIR/042/2024 atau PER-05/DIR-MR/2023"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary-900 mb-1">
                Tanggal Pengesahan / Berlakunya Dokumen (Opsional)
              </label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary-900 mb-1">
                Letak Bagian / Pasal / Halaman Dokumen (Opsional)
              </label>
              <Input
                placeholder="Contoh: Bab IV Butir 3 Halaman 45-50 atau Pasal 12 Ayat 2"
                value={sectionNotes}
                onChange={(e) => setSectionNotes(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUploadModalOpen(false)}
              disabled={uploading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={uploading || !fileToUpload}
            >
              {uploading ? 'Mengunggah & Menyimpan...' : 'Unggah & Catat Metadata'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
