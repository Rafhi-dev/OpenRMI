'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  UploadCloud,
  FileText,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  Filter,
  RefreshCw,
  Search,
  Lock,
} from 'lucide-react';

export type SupplementaryCategory = 'FGD_FOLLOW_UP' | 'INTERVIEW_CLARIFICATION' | 'AD_HOC';
export type RagIngestionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface SupplementaryDoc {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  category: SupplementaryCategory;
  description?: string;
  submissionNotes?: string;
  ragIngestionStatus: RagIngestionStatus;
  createdAt: string;
}

interface SupplementaryDocsTabProps {
  periodId?: string;
  isLocked?: boolean;
}

export function SupplementaryDocsTab({ periodId, isLocked = false }: SupplementaryDocsTabProps) {
  const [docs, setDocs] = useState<SupplementaryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [category, setCategory] = useState<SupplementaryCategory>('FGD_FOLLOW_UP');
  const [description, setDescription] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = periodId
        ? `/counterpart/supplementary-documents?periodId=${periodId}`
        : '/counterpart/supplementary-documents';
      const res = await api.get(url);

      if (res.data?.success) {
        setDocs(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat daftar dokumen tambahan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [periodId]);

  const filteredDocs = useMemo(() => {
    return docs.filter((doc) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = doc.fileName.toLowerCase().includes(q);
        const matchesDesc = doc.description?.toLowerCase().includes(q);
        const matchesNotes = doc.submissionNotes?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesNotes) return false;
      }
      if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [docs, searchQuery, selectedCategory]);

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
    if (!fileToUpload) {
      setUploadError('Silakan pilih berkas yang akan diunggah.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // 1. Ambil Presigned Upload URL
      const presignedRes = await api.post('/counterpart/supplementary-documents/presigned-url', {
        fileName: fileToUpload.name,
        mimeType: fileToUpload.type || 'application/pdf',
        fileSizeBytes: fileToUpload.size,
      });

      const { uploadUrl, fileUrl } = presignedRes.data.data;

      // 2. Direct upload ke S3 / Cloudflare R2
      try {
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': fileToUpload.type || 'application/pdf',
          },
          body: fileToUpload,
        });
      } catch (netErr) {
        console.warn('Storage PUT network info:', netErr);
      }

      // 3. Catat metadata dokumen tambahan ke backend
      await api.post('/counterpart/supplementary-documents', {
        periodId,
        fileName: fileToUpload.name,
        fileUrl: fileUrl || uploadUrl.split('?')[0],
        fileSize: fileToUpload.size,
        mimeType: fileToUpload.type || 'application/pdf',
        category,
        description: description.trim() || undefined,
        submissionNotes: submissionNotes.trim() || undefined,
      });

      setIsUploadModalOpen(false);
      setFileToUpload(null);
      setDescription('');
      setSubmissionNotes('');
      await fetchDocs();
    } catch (err: any) {
      setUploadError(
        err.response?.data?.error?.message || err.message || 'Terjadi kesalahan saat mengunggah dokumen tambahan.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (isLocked) {
      alert('Periode penilaian telah terkunci. Penghapusan tidak diizinkan.');
      return;
    }

    if (!confirm('Apakah Anda yakin ingin menghapus berkas dokumen tambahan ini?')) return;

    try {
      await api.delete(`/counterpart/supplementary-documents/${docId}`);
      await fetchDocs();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal menghapus dokumen tambahan.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getCategoryLabel = (cat: SupplementaryCategory) => {
    switch (cat) {
      case 'FGD_FOLLOW_UP':
        return 'Tindak Lanjut FGD';
      case 'INTERVIEW_CLARIFICATION':
        return 'Klarifikasi Wawancara';
      case 'AD_HOC':
        return 'Dokumen Ad-Hoc';
      default:
        return cat;
    }
  };

  const getCategoryBadgeClass = (cat: SupplementaryCategory) => {
    switch (cat) {
      case 'FGD_FOLLOW_UP':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'INTERVIEW_CLARIFICATION':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'AD_HOC':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getRagBadge = (status: RagIngestionStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Siap Dianalisis AI</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
            <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
            <span>Ekstraksi MinerU & Jina</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
            <span>Gagal Ingestion</span>
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
            <Clock className="h-3 w-3 text-amber-600" />
            <span>Dalam Antrean AI</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Strict Assessor Confidentiality Notice */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 flex items-start space-x-4">
        <div className="p-2.5 bg-blue-600 text-white rounded-lg shadow-sm shrink-0">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="space-y-1 text-xs text-blue-900 leading-relaxed">
          <h4 className="font-bold text-sm text-primary-900">
            Kerahasiaan Catatan Asesor & Integritas Penilaian Independen
          </h4>
          <p className="text-slate-600">
            Dokumen yang Anda unggah di tab ini akan diproses otomatis oleh pipeline ingestion AI (MinerU &
            Jina) untuk membantu Konsultan Eksternal melakukan reviu komparatif pasca-FGD.
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            <span className="font-bold text-blue-800">Catatan Privasi:</span> Sesuai regulasi KBUMN, hasil analisis
            mendalam dan catatan internal asesor bersifat rahasia di lembar kerja asesor untuk menjamin
            objektivitas dan netralitas evaluasi.
          </p>
        </div>
      </div>

      {/* Action Header & Search */}
      <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari berkas dokumen tambahan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 mr-2">
            <Filter className="h-3.5 w-3.5" />
            <span>Kategori:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-border-subtle rounded-md px-2.5 py-1.5 text-primary-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="FGD_FOLLOW_UP">Tindak Lanjut FGD</option>
            <option value="INTERVIEW_CLARIFICATION">Klarifikasi Wawancara</option>
            <option value="AD_HOC">Dokumen Ad-Hoc</option>
          </select>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (isLocked) {
                alert('Periode penilaian telah terkunci.');
                return;
              }
              setIsUploadModalOpen(true);
            }}
            disabled={isLocked}
            className="text-xs whitespace-nowrap ml-2"
          >
            <UploadCloud className="h-4 w-4 mr-1.5" />
            Unggah Dokumen Susulan
          </Button>
        </div>
      </div>

      {/* Documents Table */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Memuat daftar dokumen susulan pasca-FGD...</div>
      ) : error ? (
        <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-lg">{error}</div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-subtle p-12 text-center space-y-3">
          <FileText className="h-10 w-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-primary-900">Belum Ada Dokumen Tambahan</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Jika Asesor atau Tim Manajemen meminta bukti susulan setelah sesi Focus Group Discussion (FGD) atau
            wawancara, unggah berkasnya di sini.
          </p>
          {!isLocked && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="text-xs mt-2"
            >
              <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
              Unggah Dokumen Sekarang
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-border-subtle text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-3.5">Dokumen & Deskripsi</th>
                  <th className="px-6 py-3.5">Kategori</th>
                  <th className="px-6 py-3.5">Status RAG Ingestion</th>
                  <th className="px-6 py-3.5">Waktu Unggah</th>
                  <th className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 mt-0.5">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-primary-900 hover:text-emerald-700 hover:underline flex items-center space-x-1"
                          >
                            <span className="truncate">{doc.fileName}</span>
                            <ExternalLink className="h-3 w-3 inline text-slate-400" />
                          </a>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {formatFileSize(doc.fileSize)} &bull; {doc.description || 'Tidak ada deskripsi'}
                          </p>
                          {doc.submissionNotes && (
                            <p className="text-[11px] text-slate-600 italic mt-0.5">
                              Catatan: &quot;{doc.submissionNotes}&quot;
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded border ${getCategoryBadgeClass(
                          doc.category
                        )}`}
                      >
                        {getCategoryLabel(doc.category)}
                      </span>
                    </td>

                    <td className="px-6 py-4">{getRagBadge(doc.ragIngestionStatus)}</td>

                    <td className="px-6 py-4 text-slate-500 text-[11px]">
                      {new Date(doc.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <a
                          href={doc.fileUrl}
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
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 w-7 p-0"
                            title="Hapus berkas"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Supplementary Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => !uploading && setIsUploadModalOpen(false)}
        title="Unggah Dokumen Susulan Pasca-FGD"
        maxWidth="xl"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-primary-900 mb-1">
              Kategori Dokumen Tambahan
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SupplementaryCategory)}
              className="w-full text-xs bg-white border border-border-subtle rounded-md px-3 py-2 text-primary-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="FGD_FOLLOW_UP">Tindak Lanjut FGD (Notulensi, Penjelasan Tambahan)</option>
              <option value="INTERVIEW_CLARIFICATION">Klarifikasi Wawancara Direksi / Manajemen</option>
              <option value="AD_HOC">Dokumen Bukti Tambahan Ad-Hoc</option>
            </select>
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
            onClick={() => document.getElementById('supp-file-input')?.click()}
          >
            <input
              id="supp-file-input"
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
                  Tarik berkas ke sini, atau <span className="text-emerald-700 underline">pilih dari komputer</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Format didukung: PDF, DOCX, XLSX, JPEG, PNG (Maksimal 50 MB)
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-900 mb-1">
              Deskripsi Berkas (Opsional)
            </label>
            <Input
              placeholder="Contoh: Notulensi pembahasan limit risiko strategis bersama Direksi"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-900 mb-1">
              Catatan Penyerahan (Opsional)
            </label>
            <Input
              placeholder="Contoh: Diserahkan oleh Tim ERM Mandiri atas permintaan asesor"
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              className="text-xs"
            />
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
              {uploading ? 'Mengunggah & Memproses...' : 'Unggah Dokumen Susulan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
