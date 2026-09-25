'use client';

import React, { useEffect, useState } from 'react';
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
  Clock,
} from 'lucide-react';

interface CriterionEvidence {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  docNumber?: string;
  sectionNotes?: string;
  createdAt: string;
}

interface CriterionItem {
  id: number;
  letterCode: string;
  level: number;
  statement: string;
  guidanceNotes: string | null;
  defaultEvidences: string | null;
  evidences: CriterionEvidence[];
}

interface ParameterItem {
  id: number;
  code: string;
  title: string;
  criteria: CriterionItem[];
}

interface DimensionItem {
  id: number;
  code: string;
  name: string;
  subDimensions: Array<{
    id: number;
    code: string;
    name: string;
    parameters: ParameterItem[];
  }>;
}

export function EvidenceChecklistWorkspace() {
  const [dimensions, setDimensions] = useState<DimensionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded parameter state
  const [expandedParam, setExpandedParam] = useState<string | null>(null);

  // Upload Modal State
  const [selectedCriterion, setSelectedCriterion] = useState<CriterionItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [docNumber, setDocNumber] = useState('');
  const [sectionNotes, setSectionNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchChecklist = async () => {
    setLoading(true);
    try {
      const res = await api.get('/counterpart/evidence-checklist');
      if (res.data?.success) {
        setDimensions(res.data.data.dimensions);
        // Default expand first parameter
        const firstDim = res.data.data.dimensions[0];
        const firstParam = firstDim?.subDimensions[0]?.parameters[0];
        if (firstParam) {
          setExpandedParam(firstParam.code);
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
  }, []);

  const handleOpenUpload = (criterion: CriterionItem) => {
    setSelectedCriterion(criterion);
    setFileToUpload(null);
    setDocNumber('');
    setSectionNotes('');
    setUploadError(null);
    setIsUploadModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
      ];

      if (!validTypes.includes(file.type)) {
        setUploadError(
          'Format berkas tidak diizinkan. Sistem hanya menerima berkas PDF, DOCX, XLSX, JPEG, atau PNG.'
        );
        return;
      }

      setFileToUpload(file);
      setUploadError(null);
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
      // 1. Dapatkan Presigned URL dari backend
      const presignedRes = await api.post('/counterpart/evidences/presigned-url', {
        criterionId: selectedCriterion.id,
        fileName: fileToUpload.name,
        fileSize: fileToUpload.size,
        mimeType: fileToUpload.type,
      });

      const { uploadUrl, fileKey } = presignedRes.data.data;

      // 2. Upload langsung berkas ke S3 / Cloudflare R2
      const uploadHttp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': fileToUpload.type,
        },
        body: fileToUpload,
      });

      if (!uploadHttp.ok) {
        throw new Error('Gagal mengunggah berkas ke Object Storage.');
      }

      // 3. Catat metadata bukti ke database backend
      await api.post('/counterpart/evidences', {
        criterionId: selectedCriterion.id,
        fileName: fileToUpload.name,
        fileUrl: uploadUrl.split('?')[0] || fileKey,
        fileSize: fileToUpload.size,
        mimeType: fileToUpload.type,
        docNumber: docNumber.trim() || undefined,
        sectionNotes: sectionNotes.trim() || undefined,
      });

      setIsUploadModalOpen(false);
      fetchChecklist();
    } catch (err: any) {
      setUploadError(
        err.response?.data?.error?.message || err.message || 'Terjadi kesalahan saat mengunggah dokumen.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus berkas dokumen bukti ini?')) return;

    try {
      await api.delete(`/counterpart/evidences/${evidenceId}`);
      fetchChecklist();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal menghapus dokumen bukti.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Memuat checklist kriteria dan berkas eviden...</div>;
  }

  if (error) {
    return <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-md">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-primary-900">Checklist & Unggah Dokumen Bukti</h2>
          <p className="text-xs text-slate-500">
            Unggah dokumen bukti dukung sesuai pedoman pemenuhan Kolom H & I Juknis KBUMN
          </p>
        </div>
      </div>

      {/* Accordion Parameter List */}
      <div className="space-y-4">
        {dimensions.map((dim) => (
          <div key={dim.id} className="bg-white rounded-lg border border-border-subtle shadow-sm overflow-hidden">
            <div className="px-6 py-3.5 bg-surface-bg border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="primary" className="font-mono font-bold">
                  {dim.code}
                </Badge>
                <span className="font-bold text-sm text-primary-900">{dim.name}</span>
              </div>
            </div>

            <div className="divide-y divide-border-subtle">
              {dim.subDimensions.map((sd) =>
                sd.parameters.map((param) => {
                  const isExpanded = expandedParam === param.code;
                  const totalCriteria = param.criteria.length;
                  const criteriaWithEvidence = param.criteria.filter((c) => c.evidences && c.evidences.length > 0).length;

                  return (
                    <div key={param.id} className="transition-colors">
                      <button
                        onClick={() => setExpandedParam(isExpanded ? null : param.code)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-bg/50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-mono font-bold text-xs bg-brand-blue-50 text-brand-blue-700 px-2 py-1 rounded border border-brand-blue-200">
                            {param.code}
                          </span>
                          <span className="font-semibold text-sm text-primary-900">{param.title}</span>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-medium text-slate-500">
                            {criteriaWithEvidence} / {totalCriteria} kriteria terpenuhi
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Criteria Detail Panel */}
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-2 bg-slate-50/50 space-y-4">
                          {param.criteria.map((crit) => (
                            <div
                              key={crit.id}
                              className="p-4 rounded-lg bg-white border border-border-subtle shadow-xs space-y-3"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-xs text-primary-900 uppercase">
                                      Kriteria {crit.letterCode} (Level {crit.level})
                                    </span>
                                    {crit.evidences.length > 0 ? (
                                      <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Bukti Terunggah ({crit.evidences.length})
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        <Clock className="h-3 w-3 mr-1" /> Menunggu Berkas
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                    {crit.statement}
                                  </p>
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenUpload(crit)}
                                  className="shrink-0 text-xs h-8 text-brand-blue-600 border-brand-blue-200 hover:bg-brand-blue-50"
                                >
                                  <UploadCloud className="h-3.5 w-3.5 mr-1" />
                                  Unggah Bukti
                                </Button>
                              </div>

                              {/* Guidance Notes */}
                              {(crit.guidanceNotes || crit.defaultEvidences) && (
                                <div className="p-2.5 rounded bg-surface-bg border border-border-subtle/80 text-[11px] text-slate-600 space-y-1">
                                  <span className="font-bold text-slate-700 block">
                                    Pedoman Dokumen yang Wajib Disiapkan (Kolom H & I):
                                  </span>
                                  <p className="leading-relaxed">
                                    {crit.guidanceNotes || crit.defaultEvidences}
                                  </p>
                                </div>
                              )}

                              {/* Uploaded Evidence Files List */}
                              {crit.evidences.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-border-subtle">
                                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Berkas Dokumen Terlampir:
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {crit.evidences.map((ev) => (
                                      <div
                                        key={ev.id}
                                        className="flex items-center justify-between p-2 rounded-md bg-surface-bg border border-border-subtle text-xs"
                                      >
                                        <div className="flex items-center space-x-2 truncate pr-2">
                                          <FileText className="h-4 w-4 text-brand-blue-600 shrink-0" />
                                          <div className="truncate">
                                            <a
                                              href={ev.fileUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="font-medium text-brand-blue-700 hover:underline truncate block"
                                            >
                                              {ev.fileName}
                                            </a>
                                            {ev.sectionNotes && (
                                              <span className="text-[10px] text-slate-500 block truncate">
                                                Ref: {ev.sectionNotes}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <button
                                          onClick={() => handleDeleteEvidence(ev.id)}
                                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors shrink-0"
                                          title="Hapus berkas bukti"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Upload Eviden */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Unggah Dokumen Bukti Pemenuhan"
        description={
          selectedCriterion
            ? `Kriteria ${selectedCriterion.letterCode} (Level ${selectedCriterion.level})`
            : undefined
        }
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Drag & Drop File Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-primary-900">
              Pilih Berkas Dokumen <span className="text-rose-500">*</span>
            </label>
            <div className="border-2 border-dashed border-border-strong hover:border-brand-blue-500 rounded-lg p-6 text-center bg-surface-bg cursor-pointer transition-colors relative">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                required
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <UploadCloud className="h-8 w-8 text-brand-blue-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-primary-900">
                {fileToUpload ? fileToUpload.name : 'Klik atau seret berkas ke area ini'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Format diperbolehkan: PDF, DOCX, XLSX, JPEG, PNG (Maks 50 MB)
              </p>
            </div>
          </div>

          <Input
            label="Nomor Dokumen / SK Resmi (Opsional)"
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
            placeholder="SK.02/DIR/MR/2023"
          />

          <Input
            label="Keterangan Letak Pasal / Halaman Bukti"
            value={sectionNotes}
            onChange={(e) => setSectionNotes(e.target.value)}
            placeholder="Lihat Bab IV Pasal 12 & Halaman 45"
            helperText="Memudahkan asesor memverifikasi klausul spesifik yang relevan"
          />

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-border-subtle">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUploadModalOpen(false)}
              disabled={uploading}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={uploading}>
              Unggah Dokumen Bukti
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
