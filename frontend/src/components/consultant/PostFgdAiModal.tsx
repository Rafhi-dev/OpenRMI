'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  BrainCircuit,
  Lock,
  Sparkles,
  FileText,
  AlertCircle,
  CheckCircle2,
  Edit2,
  ExternalLink,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { getFileUrl } from '@/lib/fileUrl';

interface SupplementaryDoc {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  category: string;
  description?: string;
  submissionNotes?: string;
  ragIngestionStatus: string;
  createdAt: string;
}

interface AnalysisResult {
  id: string;
  customPrompt: string;
  aiResponse: string;
  assessorNotes?: string;
  isPrivateToAssessor: boolean;
  updatedAt: string;
}

interface PostFgdAiModalProps {
  periodId: string;
  isLocked?: boolean;
}

export function PostFgdAiModal({ periodId, isLocked = false }: PostFgdAiModalProps) {
  const [docs, setDocs] = useState<SupplementaryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Doc & AI Modal
  const [selectedDoc, setSelectedDoc] = useState<SupplementaryDoc | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [assessorNotes, setAssessorNotes] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/counterpart/supplementary-documents?periodId=${periodId}`);
      if (res.data?.success) {
        setDocs(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat dokumen pasca-FGD.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [periodId]);

  const handleOpenAiAnalyze = async (doc: SupplementaryDoc) => {
    setSelectedDoc(doc);
    setCustomPrompt('');
    setAnalysisResult(null);
    setAssessorNotes('');
    setActionError(null);
    setIsModalOpen(true);

    // Cek apakah sudah ada hasil analisis sebelumnya
    try {
      const res = await api.get(`/consultant/supplementary-documents/${doc.id}/analysis-result`);
      if (res.data?.success && res.data.data) {
        setAnalysisResult(res.data.data);
        setCustomPrompt(res.data.data.customPrompt || '');
        setAssessorNotes(res.data.data.assessorNotes || '');
      }
    } catch {
      // Belum ada analisis sebelumnya
    }
  };

  const handleRunAiAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !customPrompt.trim()) return;

    setAnalyzing(true);
    setActionError(null);

    try {
      const res = await api.post(`/consultant/supplementary-documents/${selectedDoc.id}/ai-analyze`, {
        customPrompt: customPrompt.trim(),
      });

      if (res.data?.success) {
        setAnalysisResult(res.data.data);
        setAssessorNotes(res.data.data.assessorNotes || '');
      }
    } catch (err: any) {
      setActionError(
        err.response?.data?.error?.message || err.message || 'Gagal menjalankan analisis AI DeepSeek.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveAssessorNotes = async () => {
    if (!selectedDoc || !analysisResult?.id) return;

    setSavingNotes(true);
    setActionError(null);

    try {
      await api.put(`/consultant/supplementary-documents/analysis-result/${analysisResult.id}`, {
        assessorNotes: assessorNotes.trim(),
        isPrivateToAssessor: true,
      });

      alert('Catatan privat internal asesor berhasil disimpan.');
    } catch (err: any) {
      setActionError(
        err.response?.data?.error?.message || err.message || 'Gagal menyimpan catatan asesor.'
      );
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Strict Confidentiality Banner */}
      <div className="p-5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl flex items-start space-x-3.5">
        <div className="p-2.5 bg-purple-700 text-white rounded-lg shrink-0">
          <Lock className="h-5 w-5" />
        </div>
        <div className="text-xs text-purple-950 space-y-1 leading-relaxed">
          <h4 className="font-bold text-sm text-purple-900">
            Kerahasiaan Catatan Asesor & Analisis Cerdas Bebas (Custom Prompt)
          </h4>
          <p className="text-slate-600">
            Anda dapat meminta AI DeepSeek untuk meneliti dokumen susulan pasca-FGD dengan instruksi kustom apa pun.
            Seluruh hasil analisis dan catatan internal yang Anda simpan di modul ini <strong>BERSIFAT RAHASIA MUTLAK</strong>{' '}
            dan tidak pernah dapat diakses oleh Tim Counterpart klien.
          </p>
        </div>
      </div>

      {/* Supplementary Documents List */}
      <div className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden p-6 space-y-4">
        <h4 className="text-sm font-bold text-primary-900">
          Daftar Dokumen Pasca-FGD & Klarifikasi Wawancara ({docs.length})
        </h4>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Memuat berkas susulan...</div>
        ) : error ? (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg">{error}</div>
        ) : docs.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">
            Tim Counterpart belum mengunggah dokumen susulan pasca-FGD untuk periode ini.
          </p>
        ) : (
          <div className="divide-y divide-border-subtle border border-border-subtle rounded-xl overflow-hidden">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0 mt-0.5">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <a
                      href={getFileUrl(doc, 'supplementary')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-xs text-primary-900 hover:text-purple-700 hover:underline flex items-center space-x-1"
                    >
                      <span className="truncate">{doc.fileName}</span>
                      <ExternalLink className="h-3 w-3 inline text-slate-400" />
                    </a>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Kategori: <strong className="text-slate-700">{doc.category}</strong> &bull;{' '}
                      {doc.description || 'Tidak ada deskripsi'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenAiAnalyze(doc)}
                    className="border-purple-300 text-purple-800 hover:bg-purple-50 text-xs font-semibold"
                  >
                    <BrainCircuit className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
                    Analisis AI Cerdas
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Custom Prompt Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !analyzing && setIsModalOpen(false)}
        title="Analisis Cerdas AI Dokumen Susulan (DeepSeek LLM)"
        maxWidth="xl"
      >
        <div className="space-y-4 text-xs">
          {selectedDoc && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-semibold">Berkas yang Diteliti:</span>
              <p className="font-bold text-primary-900 mt-0.5">{selectedDoc.fileName}</p>
            </div>
          )}

          {/* Custom Prompt Form */}
          <form onSubmit={handleRunAiAnalysis} className="space-y-2">
            <label className="block font-semibold text-primary-900">
              Instruksi / Perintah Bebas untuk AI (Custom Prompt) *
            </label>
            <textarea
              rows={3}
              placeholder="Contoh: Analisis apakah SOP ini sudah mengatur eskalasi limit risiko ke Direksi? Ekstrak temuan audit yang belum diselesaikan pada notulen ini."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              required
              className="w-full bg-white border border-border-subtle rounded-lg p-2.5 text-primary-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={analyzing || !customPrompt.trim()}
                className="bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {analyzing ? 'Menganalisis Dokumen via DeepSeek...' : 'Jalankan Analisis AI'}
              </Button>
            </div>
          </form>

          {actionError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* AI Response Box */}
          {analysisResult && (
            <div className="space-y-4 pt-3 border-t border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-purple-900">
                  <BrainCircuit className="h-4 w-4 text-purple-600" />
                  <span>Jawaban Analisis AI DeepSeek:</span>
                </div>
                <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {analysisResult.aiResponse}
                </div>
              </div>

              {/* Private Assessor Notes Edit */}
              <div className="space-y-1.5 bg-purple-50/60 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-purple-950 flex items-center space-x-1.5">
                    <Lock className="h-3.5 w-3.5 text-purple-700" />
                    <span>Catatan Privat Internal Asesor (Hanya Anda yang Dapat Melihat)</span>
                  </label>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSaveAssessorNotes}
                    disabled={savingNotes}
                    className="text-xs h-7 bg-purple-700 hover:bg-purple-800"
                  >
                    {savingNotes ? 'Menyimpan...' : 'Simpan Catatan'}
                  </Button>
                </div>
                <textarea
                  rows={3}
                  placeholder="Sunting atau tambahkan kesimpulan internal tim asesor berdasarkan hasil analisis di atas..."
                  value={assessorNotes}
                  onChange={(e) => setAssessorNotes(e.target.value)}
                  className="w-full bg-white border border-purple-200 rounded-lg p-2.5 text-primary-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
