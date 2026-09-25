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
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface SupplementaryDocItem {
  id: string;
  title: string;
  category: 'FGD_FOLLOW_UP' | 'INTERVIEW_CLARIFICATION' | 'AD_HOC';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  notes: string | null;
  ragIngestionStatus: string;
  createdAt: string;
}

export function SupplementaryDocsTab() {
  const [docs, setDocs] = useState<SupplementaryDocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'FGD_FOLLOW_UP' | 'INTERVIEW_CLARIFICATION' | 'AD_HOC'>(
    'FGD_FOLLOW_UP'
  );
  const [notes, setNotes] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/counterpart/supplementary-documents');
      if (res.data?.success) {
        setDocs(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat dokumen tambahan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

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
        setUploadError('Hanya berkas format PDF, DOCX, XLSX, JPEG, atau PNG yang diizinkan.');
        return;
      }

      setFileToUpload(file);
      setUploadError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) {
      setUploadError('Silakan pilih berkas yang akan diunggah.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // 1. Catat dokumen tambahan (presigned URL atau upload langsung)
      // Pada endpoint counterpart, dokumen tambahan disimpan langsung metadata dan URL
      await api.post('/counterpart/supplementary-documents', {
        title: title.trim(),
        category,
        fileName: fileToUpload.name,
        fileUrl: `https://storage.openrmi.id/supplementary/${Date.now()}-${fileToUpload.name}`,
        fileSize: fileToUpload.size,
        mimeType: fileToUpload.type,
        notes: notes.trim() || undefined,
      });

      setIsModalOpen(false);
      setTitle('');
      setNotes('');
      setFileToUpload(null);
      fetchDocs();
    } catch (err: any) {
      setUploadError(err.response?.data?.error?.message || 'Gagal mengunggah dokumen tambahan.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus berkas dokumen tambahan ini?')) return;
    try {
      await api.delete(`/counterpart/supplementary-documents/${id}`);
      fetchDocs();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal menghapus dokumen.');
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'FGD_FOLLOW_UP':
        return 'Tindak Lanjut FGD';
      case 'INTERVIEW_CLARIFICATION':
        return 'Klarifikasi Wawancara';
      default:
        return 'Dokumen Tambahan';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-primary-900">
            Dokumen Tambahan & Tindak Lanjut Pasca-FGD
          </h2>
          <p className="text-xs text-slate-500">
            Unggah dokumen klarifikasi yang diminta oleh konsultan asesor setelah sesi reviu awal atau wawancara
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
          <UploadCloud className="h-4 w-4 mr-1" />
          Unggah Dokumen Tambahan
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
          {error}
        </div>
      )}

      {/* Info Card RAG */}
      <div className="p-4 bg-purple-50/70 rounded-lg border border-purple-100 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
        <div className="text-xs text-purple-900 leading-relaxed">
          <span className="font-bold">Pemrosesan AI Otomatis (RAG Pipeline):</span> Seluruh dokumen
          tambahan yang Anda unggah secara otomatis diekstrak layout dan tabelnya menggunakan MinerU serta
          diindeks vektor semantik via Jina AI agar konsultan asesor dapat melakukan penelusuran klausul secara cepat.
        </div>
      </div>

      {/* Tabel Dokumen Tambahan */}
      <div className="bg-white rounded-lg border border-border-subtle shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-primary-900">
            <thead className="bg-surface-bg border-b border-border-subtle text-xs uppercase font-semibold text-slate-600">
              <tr>
                <th className="px-6 py-3.5">Judul Dokumen & Berkas</th>
                <th className="px-6 py-3.5">Kategori Pengajuan</th>
                <th className="px-6 py-3.5">Catatan Pengantar</th>
                <th className="px-6 py-3.5 text-center">Status RAG AI</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs">
                    Memuat dokumen tambahan...
                  </td>
                </tr>
              ) : docs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs">
                    Belum ada dokumen tambahan yang diunggah.
                  </td>
                </tr>
              ) : (
                docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-bg/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-primary-900">{doc.title}</div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-blue-600 hover:underline flex items-center gap-1 mt-0.5 font-mono"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {doc.fileName}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <Badge variant="outline">{getCategoryLabel(doc.category)}</Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {doc.notes || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {doc.ragIngestionStatus === 'COMPLETED' ? (
                        <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Terindeks AI
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <Clock className="h-3.5 w-3.5 mr-1" /> Memproses
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Hapus berkas"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Upload */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Unggah Dokumen Tambahan Pasca-FGD"
        description="Dokumen ini akan dianalisis oleh AI dan ditelaah oleh konsultan penilai"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <Input
            label="Judul Dokumen Tambahan"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Klarifikasi Notulen Rapat BoD terkait Eskalasi Limit Risiko"
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-primary-900">
              Kategori Dokumen <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-border-strong bg-white px-3 py-2 text-sm text-primary-900 focus:border-brand-blue-600 focus:outline-none"
            >
              <option value="FGD_FOLLOW_UP">Tindak Lanjut Sesi FGD (Focus Group Discussion)</option>
              <option value="INTERVIEW_CLARIFICATION">Klarifikasi Dokumen Hasil Wawancara</option>
              <option value="AD_HOC">Dokumen Tambahan Umum (Ad-Hoc)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-primary-900">
              Pilih Berkas <span className="text-rose-500">*</span>
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
              required
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-brand-blue-50 file:text-brand-blue-700 hover:file:bg-brand-blue-100"
            />
          </div>

          <Input
            label="Catatan Pengantar untuk Asesor"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dokumen ini melengkapi pasal mitigasi risiko operasional yang dibahas kemarin"
          />

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-border-subtle">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={uploading}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={uploading}>
              Unggah Dokumen
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
