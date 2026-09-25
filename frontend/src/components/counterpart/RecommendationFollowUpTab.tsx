'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  FileCheck2,
} from 'lucide-react';

interface FollowUpRecord {
  id: string;
  quarter: string;
  year: number;
  progressNotes: string;
  evidenceFileUrl: string | null;
  statusReported: 'S' | 'BS' | 'BD' | 'TDD';
  reportedBy: string;
  createdAt: string;
}

interface RecommendationItem {
  id: number;
  parameterCode: string;
  recommendation: string;
  targetDate: string;
  mainActivities: string;
  expectedOutput: string;
  successIndicator: string;
  unitInCharge: string;
  priorityQuadrant: number;
  horizon: string;
  status: 'S' | 'BS' | 'BD' | 'TDD';
  followUps: FollowUpRecord[];
}

export function RecommendationFollowUpTab() {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedRec, setSelectedRec] = useState<RecommendationItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quarter, setQuarter] = useState<'TW_1' | 'TW_2' | 'TW_3' | 'TW_4'>('TW_1');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [progressNotes, setProgressNotes] = useState('');
  const [statusReported, setStatusReported] = useState<'S' | 'BS' | 'BD' | 'TDD'>('S');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const res = await api.get('/counterpart/follow-ups');
      if (res.data?.success) {
        setRecommendations(res.data.data.recommendations || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat rekomendasi tindak lanjut.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const handleOpenReportModal = (rec: RecommendationItem) => {
    setSelectedRec(rec);
    setProgressNotes('');
    setEvidenceUrl('');
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleSubmitFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRec) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await api.post('/counterpart/follow-ups', {
        recommendationId: selectedRec.id,
        quarter,
        year: parseInt(year, 10),
        progressNotes: progressNotes.trim(),
        statusReported,
        evidenceFileUrl: evidenceUrl.trim() || undefined,
      });

      setIsModalOpen(false);
      fetchFollowUps();
    } catch (err: any) {
      setSubmitError(err.response?.data?.error?.message || 'Gagal mengirim laporan tindak lanjut.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'S':
        return <Badge variant="success">S (Sesuai)</Badge>;
      case 'BS':
        return <Badge variant="warning">BS (Belum Sesuai)</Badge>;
      case 'BD':
        return <Badge variant="danger">BD (Belum Ditindaklanjuti)</Badge>;
      default:
        return <Badge variant="outline">TDD (Tidak Dapat Ditindaklanjuti)</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-primary-900">
          Pemantauan Tindak Lanjut Rekomendasi (Format 1.2.9)
        </h2>
        <p className="text-xs text-slate-500">
          Laporkan kemajuan tindak lanjut rekomendasi perbaikan KBUMN secara triwulanan (Quarterly Progress)
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
          {error}
        </div>
      )}

      {/* Tabel Rekomendasi */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-lg border border-border-subtle">
            Memuat daftar rekomendasi dan tindak lanjut...
          </div>
        ) : recommendations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-lg border border-border-subtle">
            Belum ada rekomendasi yang diterbitkan oleh konsultan untuk periode ini.
          </div>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-white rounded-lg border border-border-subtle shadow-sm overflow-hidden p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-border-subtle pb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs bg-brand-blue-50 text-brand-blue-700 px-2 py-0.5 rounded border border-brand-blue-200">
                      {rec.parameterCode}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Kuadran {rec.priorityQuadrant} • {rec.horizon === 'SHORT_TERM' ? 'Jangka Pendek (<1 thn)' : 'Jangka Panjang (>1 thn)'}
                    </span>
                    {getStatusBadge(rec.status)}
                  </div>
                  <h3 className="text-sm font-bold text-primary-900 leading-snug">
                    {rec.recommendation}
                  </h3>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenReportModal(rec)}
                  className="shrink-0 text-xs h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Kirim Laporan Triwulan
                </Button>
              </div>

              {/* Detail Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-surface-bg p-3 rounded-lg border border-border-subtle/70">
                <div>
                  <span className="font-bold text-slate-500 block">Unit Penanggung Jawab (UIC):</span>
                  <span className="text-slate-800 font-medium">{rec.unitInCharge}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block">Target Penyelesaian:</span>
                  <span className="text-slate-800 font-medium">
                    {rec.targetDate ? new Date(rec.targetDate).toLocaleDateString('id-ID') : '-'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block">Indikator Capaian:</span>
                  <span className="text-slate-800 font-medium">{rec.successIndicator}</span>
                </div>
              </div>

              {/* Riwayat Tindak Lanjut */}
              {rec.followUps && rec.followUps.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Riwayat Laporan Progres ({rec.followUps.length}):
                  </span>
                  <div className="space-y-2">
                    {rec.followUps.map((fu) => (
                      <div
                        key={fu.id}
                        className="p-3 rounded-md bg-white border border-border-subtle text-xs space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-primary-900">
                            {fu.quarter} {fu.year}
                          </span>
                          {getStatusBadge(fu.statusReported)}
                        </div>
                        <p className="text-slate-700 leading-relaxed">{fu.progressNotes}</p>
                        {fu.evidenceFileUrl && (
                          <a
                            href={fu.evidenceFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-[11px] text-brand-blue-600 hover:underline pt-1"
                          >
                            <FileText className="h-3 w-3 mr-1" /> Berkas Bukti Tindak Lanjut
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal Kirim Tindak Lanjut */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Laporan Progres Tindak Lanjut Triwulanan"
        description={selectedRec ? `Parameter: ${selectedRec.parameterCode}` : undefined}
      >
        <form onSubmit={handleSubmitFollowUp} className="space-y-4">
          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-primary-900">
                Pilih Periode Triwulan
              </label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-border-strong bg-white px-3 py-2 text-sm text-primary-900 focus:border-brand-blue-600 focus:outline-none"
              >
                <option value="TW_1">Triwulan I (TW 1)</option>
                <option value="TW_2">Triwulan II (TW 2)</option>
                <option value="TW_3">Triwulan III (TW 3)</option>
                <option value="TW_4">Triwulan IV (TW 4)</option>
              </select>
            </div>

            <Input
              label="Tahun Pelaporan"
              type="number"
              min="2020"
              max="2035"
              required
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-primary-900">
              Status Kepatuhan yang Dilaporkan <span className="text-rose-500">*</span>
            </label>
            <select
              value={statusReported}
              onChange={(e) => setStatusReported(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-border-strong bg-white px-3 py-2 text-sm text-primary-900 focus:border-brand-blue-600 focus:outline-none"
            >
              <option value="S">S - Sesuai (Rekomendasi telah tuntas ditindaklanjuti)</option>
              <option value="BS">BS - Belum Sesuai (Sedang berjalan namun belum tuntas)</option>
              <option value="BD">BD - Belum Ditindaklanjuti (Belum ada aktivitas nyata)</option>
              <option value="TDD">TDD - Tidak Dapat Ditindaklanjuti (Kendala regulasi/force majeure)</option>
            </select>
          </div>

          <Input
            label="Uraian Kemajuan / Realisasi Tindak Lanjut"
            required
            value={progressNotes}
            onChange={(e) => setProgressNotes(e.target.value)}
            placeholder="Telah dilaksanakan workshop penyusunan risk profile pada tanggal 15 Maret..."
          />

          <Input
            label="Tautan Berkas Bukti Tindak Lanjut (Opsional)"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="https://storage.pelindo.co.id/dokumen/tindak-lanjut-tw1.pdf"
          />

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-border-subtle">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              Kirim Laporan Progres
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
