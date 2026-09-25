'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  Users,
  QrCode,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  BarChart3,
  Calendar,
  Share2,
} from 'lucide-react';

interface SurveyStatusData {
  isInitiated: boolean;
  survey: {
    id: string;
    publicToken: string;
    publicUrl: string;
    qrPayload: string;
    isActive: boolean;
    totalResponses: number;
    averageScore: number | null;
    startDate?: string;
    endDate?: string;
    categoryAverages?: Record<string, number>;
  } | null;
}

interface RiskCultureSurveyManagerProps {
  periodId?: string;
  isLocked?: boolean;
}

export function RiskCultureSurveyManager({ periodId, isLocked = false }: RiskCultureSurveyManagerProps) {
  const [data, setData] = useState<SurveyStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [initiating, setInitiating] = useState(false);

  const fetchStatus = async () => {
    if (!periodId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/surveys/status?periodId=${periodId}`);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat status survei budaya risiko.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [periodId]);

  const handleInitiate = async () => {
    setInitiating(true);
    try {
      await api.post('/surveys/initiate', {
        periodId,
        isActive: true,
      });
      await fetchStatus();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal menginisiasi survei budaya risiko.');
    } finally {
      setInitiating(false);
    }
  };

  const handleToggleActive = async () => {
    if (!data?.survey) return;
    setToggling(true);
    try {
      await api.patch('/surveys/toggle', {
        periodId,
        isActive: !data.survey.isActive,
      });
      await fetchStatus();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal mengubah status survei.');
    } finally {
      setToggling(false);
    }
  };

  const handleCopyLink = () => {
    if (!data?.survey) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const fullUrl = `${origin}/surveys/fill/${data.survey.publicToken}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return <div className="py-16 text-center text-xs text-slate-400">Memeriksa konfigurasi survei budaya risiko...</div>;
  }

  const survey = data?.survey;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-primary-900">
              Survei Budaya Risiko Karyawan (Akses Publik Tanpa Login)
            </h3>
            <Badge variant="primary" className="text-[10px] font-mono">
              FR-6.1 &bull; Likert 1-5
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Menghasilkan tautan publik bertoken unik dan QR Code untuk pengisian kuesioner skala Likert secara
            mandiri oleh seluruh pegawai BUMN tanpa mengharuskan pendaftaran akun atau kata sandi.
          </p>
        </div>

        {!data?.isInitiated ? (
          <Button
            variant="primary"
            size="sm"
            onClick={handleInitiate}
            disabled={initiating || isLocked}
            className="text-xs shrink-0 font-bold shadow-xs bg-emerald-600 hover:bg-emerald-700"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            {initiating ? 'Menginisiasi...' : 'Inisiasi Survei Budaya Risiko'}
          </Button>
        ) : (
          <div className="flex items-center space-x-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQrModalOpen(true)}
              className="text-xs font-semibold"
            >
              <QrCode className="h-4 w-4 mr-1.5 text-emerald-600" />
              Tampilkan QR Code
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleActive}
              disabled={toggling || isLocked}
              className={`text-xs font-semibold ${
                survey?.isActive ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {survey?.isActive ? (
                <>
                  <ToggleRight className="h-4 w-4 mr-1 text-emerald-600" />
                  Status: Buka (Aktif)
                </>
              ) : (
                <>
                  <ToggleLeft className="h-4 w-4 mr-1 text-slate-400" />
                  Status: Tutup (Non-aktif)
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
          {error}
        </div>
      )}

      {/* Survey Active Control Panel */}
      {data?.isInitiated && survey && (
        <div className="space-y-6">
          {/* Live Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Responden Terkumpul</p>
                <h3 className="text-2xl font-extrabold text-primary-900">{survey.totalResponses}</h3>
                <p className="text-[11px] text-slate-400">Pegawai berpartisipasi</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-brand-blue-50 text-brand-blue-600 rounded-lg">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Rerata Skor Persepsi</p>
                <h3 className="text-2xl font-extrabold text-brand-blue-700">
                  {survey.averageScore ? Number(survey.averageScore).toFixed(2) : '-'}
                </h3>
                <p className="text-[11px] text-slate-400">Skala 1.00 s.d. 5.00</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <Share2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Status Partisipasi</p>
                <h3 className="text-sm font-bold text-primary-900 mt-1">
                  {survey.isActive ? 'Menerima Tanggapan' : 'Pengisian Ditutup'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {survey.isActive ? 'Tautan publik aktif' : 'Kuesioner terkunci'}
                </p>
              </div>
            </div>
          </div>

          {/* Public Link Share Box */}
          <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Tautan Publik Kuesioner (Bagikan ke Karyawan)
            </h4>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Input
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/surveys/fill/${survey.publicToken}`}
                className="text-xs font-mono bg-slate-50"
              />

              <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="text-xs font-semibold w-full sm:w-auto"
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  {copied ? 'Tersalin!' : 'Salin Tautan'}
                </Button>

                <a
                  href={`/surveys/fill/${survey.publicToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center space-x-1.5 shadow-xs"
                >
                  <span>Buka Form</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Karyawan dapat mengakses tautan di atas melalui browser laptop, tablet, atau smartphone secara mandiri.
            </p>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="QR Code Survei Budaya Risiko Publik"
        maxWidth="md"
      >
        <div className="p-6 text-center space-y-4">
          <div className="bg-slate-900 p-6 rounded-2xl w-48 h-48 mx-auto flex flex-col items-center justify-center text-white space-y-2">
            <QrCode className="h-28 w-28 text-emerald-400" />
            <span className="text-[10px] font-mono font-bold text-slate-400">Scan via Smartphone</span>
          </div>

          <div className="space-y-1 text-xs">
            <p className="font-bold text-primary-900">Pindai untuk Mengisi Kuesioner</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Cetak QR Code ini pada banner sosialisasi atau tampilkan pada slide presentasi rapat koordinasi BUMN.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQrModalOpen(false)}
              className="text-xs"
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
