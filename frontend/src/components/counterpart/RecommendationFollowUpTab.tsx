'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  Send,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
} from 'lucide-react';

export type RecommendationStatus = 'S' | 'BS' | 'BD' | 'TDD';
export type FollowUpQuarter = 'TW_1' | 'TW_2' | 'TW_3' | 'TW_4';

export interface FollowUpRecord {
  id: string;
  quarter: FollowUpQuarter;
  year: number;
  progressNotes: string;
  evidenceFileUrl?: string;
  statusReported: RecommendationStatus;
  createdAt: string;
}

export interface RecommendationItem {
  id: string;
  parameterCode: string;
  recommendation: string;
  targetDate: string;
  mainActivities: string;
  expectedOutput: string;
  successIndicator: string;
  unitInCharge: string;
  priorityQuadrant: number;
  horizon: string;
  status: RecommendationStatus;
  followUpRecords: FollowUpRecord[];
}

interface RecommendationFollowUpTabProps {
  periodId?: string;
  isLocked?: boolean;
}

export function RecommendationFollowUpTab({ periodId, isLocked = false }: RecommendationFollowUpTabProps) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Expanded items
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Follow-up Submission Modal
  const [selectedRec, setSelectedRec] = useState<RecommendationItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quarter, setQuarter] = useState<FollowUpQuarter>('TW_1');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [statusReported, setStatusReported] = useState<RecommendationStatus>('BS');
  const [progressNotes, setProgressNotes] = useState('');
  const [evidenceFileUrl, setEvidenceFileUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = periodId
        ? `/counterpart/follow-ups?periodId=${periodId}`
        : '/counterpart/follow-ups';
      const res = await api.get(url);

      if (res.data?.success) {
        setRecommendations(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat daftar rekomendasi tindak lanjut.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [periodId]);

  const toggleExpand = (recId: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [recId]: !prev[recId],
    }));
  };

  const filteredRecs = useMemo(() => {
    return recommendations.filter((rec) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = rec.parameterCode.toLowerCase().includes(q);
        const matchesText = rec.recommendation.toLowerCase().includes(q);
        const matchesPic = rec.unitInCharge.toLowerCase().includes(q);
        if (!matchesCode && !matchesText && !matchesPic) return false;
      }
      if (statusFilter !== 'ALL' && rec.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [recommendations, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = recommendations.length;
    const sCount = recommendations.filter((r) => r.status === 'S').length;
    const bsCount = recommendations.filter((r) => r.status === 'BS').length;
    const bdCount = recommendations.filter((r) => r.status === 'BD').length;
    const tddCount = recommendations.filter((r) => r.status === 'TDD').length;

    return { total, sCount, bsCount, bdCount, tddCount };
  }, [recommendations]);

  const handleOpenReportModal = (rec: RecommendationItem) => {
    setSelectedRec(rec);
    setQuarter('TW_1');
    setYear(new Date().getFullYear());
    setStatusReported(rec.status === 'BD' ? 'BS' : rec.status);
    setProgressNotes('');
    setEvidenceFileUrl('');
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRec) return;

    if (!progressNotes.trim()) {
      setSubmitError('Catatan progres tindak lanjut wajib diisi.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await api.post('/counterpart/follow-ups', {
        recommendationId: selectedRec.id,
        quarter,
        year: Number(year),
        progressNotes: progressNotes.trim(),
        evidenceFileUrl: evidenceFileUrl.trim() || undefined,
        statusReported,
      });

      setIsModalOpen(false);
      await fetchRecommendations();
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.error?.message || err.message || 'Gagal menyimpan laporan progres tindak lanjut.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFollowUp = async (followUpId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan progres triwulan ini?')) return;

    try {
      await api.delete(`/counterpart/follow-ups/${followUpId}`);
      await fetchRecommendations();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal menghapus catatan tindak lanjut.');
    }
  };

  const getStatusBadge = (status: RecommendationStatus) => {
    switch (status) {
      case 'S':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>S (Sesuai)</span>
          </span>
        );
      case 'BS':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
            <Clock className="h-3 w-3 text-blue-600" />
            <span>BS (Belum Sesuai)</span>
          </span>
        );
      case 'BD':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
            <AlertCircle className="h-3 w-3 text-amber-600" />
            <span>BD (Belum Ditindaklanjuti)</span>
          </span>
        );
      case 'TDD':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
            <span>TDD (Tidak Dapat Diterapkan)</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-sm flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Sesuai (S)</p>
            <h3 className="text-lg font-bold text-emerald-700">{stats.sCount} Rekomendasi</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-sm flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Dalam Proses (BS)</p>
            <h3 className="text-lg font-bold text-blue-700">{stats.bsCount} Rekomendasi</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-sm flex items-center space-x-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Belum Realisasi (BD)</p>
            <h3 className="text-lg font-bold text-amber-700">{stats.bdCount} Rekomendasi</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-sm flex items-center space-x-3">
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Total Rekomendasi</p>
            <h3 className="text-lg font-bold text-primary-900">{stats.total} Rencana Aksi</h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari rekomendasi, kode parameter, atau PIC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 mr-2">
            <Filter className="h-3.5 w-3.5" />
            <span>Status Tindak Lanjut:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-border-subtle rounded-md px-3 py-1.5 text-primary-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="S">S (Sesuai)</option>
            <option value="BS">BS (Belum Sesuai / Sedang Berjalan)</option>
            <option value="BD">BD (Belum Ditindaklanjuti)</option>
            <option value="TDD">TDD (Tidak Dapat Diterapkan)</option>
          </select>
        </div>
      </div>

      {/* Recommendations List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Memuat matriks rekomendasi dan rencana aksi...</div>
      ) : error ? (
        <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-lg">{error}</div>
      ) : filteredRecs.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-subtle p-12 text-center space-y-3">
          <ClipboardList className="h-10 w-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-primary-900">Belum Ada Rekomendasi Terdaftar</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Rekomendasi perbaikan akan diterbitkan oleh Tim Asesor setelah kalkulasi skor dan draf gap analisis tuntas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecs.map((rec) => {
            const isExpanded = !!expandedItems[rec.id];
            const recordsCount = rec.followUpRecords?.length || 0;

            return (
              <div
                key={rec.id}
                className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden transition-all"
              >
                {/* Recommendation Header */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-brand-blue-50 text-brand-blue-700 px-2 py-0.5 rounded border border-brand-blue-200">
                        {rec.parameterCode}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                        Kuadran {rec.priorityQuadrant}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Horizon: {rec.horizon === 'SHORT_TERM' ? 'Jangka Pendek (< 1 Tahun)' : 'Jangka Panjang (> 1 Tahun)'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-primary-900 leading-snug">{rec.recommendation}</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400 font-medium">Unit In Charge (UIC): </span>
                        <span className="font-bold text-slate-800">{rec.unitInCharge}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Target Penyelesaian: </span>
                        <span className="font-semibold text-slate-800">
                          {new Date(rec.targetDate).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Output: </span>
                        <span className="font-semibold text-slate-800 truncate">{rec.expectedOutput}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end justify-between space-y-3 shrink-0">
                    <div>{getStatusBadge(rec.status)}</div>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleOpenReportModal(rec)}
                        className="text-xs"
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Laporkan Progres
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleExpand(rec.id)}
                        className="text-xs text-slate-600"
                      >
                        {recordsCount} Laporan
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 ml-1" />
                        ) : (
                          <ChevronRight className="h-4 w-4 ml-1" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Follow-up Records History */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Riwayat Pelaporan Progres Triwulanan ({recordsCount})
                    </span>

                    {recordsCount === 0 ? (
                      <p className="text-xs text-slate-500 italic p-3 bg-white rounded-lg border border-slate-200">
                        Belum ada laporan progres triwulan untuk rekomendasi ini. Klik tombol{' '}
                        <strong>Laporkan Progres</strong> di atas.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
                        {rec.followUpRecords.map((item) => (
                          <div
                            key={item.id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-xs text-primary-900">
                                  {item.quarter.replace('_', ' ')} {item.year}
                                </span>
                                {getStatusBadge(item.statusReported)}
                                <span className="text-[10px] text-slate-400">
                                  &bull; Dilaporkan{' '}
                                  {new Date(item.createdAt).toLocaleDateString('id-ID')}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed">
                                {item.progressNotes}
                              </p>
                              {item.evidenceFileUrl && (
                                <a
                                  href={item.evidenceFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-emerald-700 font-semibold hover:underline flex items-center space-x-1 mt-1"
                                >
                                  <ExternalLink className="h-3 w-3 inline mr-1" />
                                  <span>Lihat Bukti Pendukung Implementasi</span>
                                </a>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFollowUp(item.id)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 w-7 p-0 self-end sm:self-center shrink-0"
                              title="Hapus laporan triwulan ini"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Follow-up Submission Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title="Laporan Progres Tindak Lanjut Rekomendasi"
        maxWidth="xl"
      >
        <form onSubmit={handleFollowUpSubmit} className="space-y-4">
          {selectedRec && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <span className="font-semibold text-slate-500">Rekomendasi Terpilih:</span>
              <p className="font-bold text-primary-900 mt-0.5">
                <span className="font-mono text-brand-blue-700 mr-1">[{selectedRec.parameterCode}]</span>
                {selectedRec.recommendation}
              </p>
              <p className="text-slate-600 mt-1">PIC: {selectedRec.unitInCharge}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-primary-900 mb-1">
                Triwulan Pelaporan
              </label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(e.target.value as FollowUpQuarter)}
                className="w-full text-xs bg-white border border-border-subtle rounded-md px-3 py-2 text-primary-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="TW_1">Triwulan I (TW 1)</option>
                <option value="TW_2">Triwulan II (TW 2)</option>
                <option value="TW_3">Triwulan III (TW 3)</option>
                <option value="TW_4">Triwulan IV (TW 4)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary-900 mb-1">
                Tahun Pelaporan
              </label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                required
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-900 mb-1">
              Status Capaian Tindak Lanjut *
            </label>
            <select
              value={statusReported}
              onChange={(e) => setStatusReported(e.target.value as RecommendationStatus)}
              className="w-full text-xs bg-white border border-border-subtle rounded-md px-3 py-2 text-primary-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="BS">BS - Belum Sesuai (Sedang Dalam Proses Pelaksanaan)</option>
              <option value="S">S - Sesuai (Telah Selesai dan Tervalidasi Penuh)</option>
              <option value="BD">BD - Belum Ditindaklanjuti (Belum Ada Aktivitas)</option>
              <option value="TDD">TDD - Tidak Dapat Diterapkan (Terdapat Hambatan/Regulasi Baru)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-900 mb-1">
              Uraian Realisasi & Catatan Progres *
            </label>
            <textarea
              rows={3}
              placeholder="Jelaskan progres aktivitas utama, dokumen yang telah diterbitkan, atau kendala yang dihadapi..."
              value={progressNotes}
              onChange={(e) => setProgressNotes(e.target.value)}
              required
              className="w-full text-xs bg-white border border-border-subtle rounded-md p-2.5 text-primary-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-900 mb-1">
              Tautan / URL Berkas Bukti Pendukung (Opsional)
            </label>
            <Input
              placeholder="https://storage.perusahaan.co.id/dokumen-sk-sop.pdf"
              value={evidenceFileUrl}
              onChange={(e) => setEvidenceFileUrl(e.target.value)}
              className="text-xs"
            />
          </div>

          {submitError && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
            >
              {submitting ? 'Menyimpan...' : 'Simpan Laporan Progres'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
