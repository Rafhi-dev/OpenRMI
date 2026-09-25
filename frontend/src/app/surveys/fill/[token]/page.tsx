'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  Calendar,
  Sparkles,
  Send,
  HelpCircle,
  Check,
  HeartHandshake,
} from 'lucide-react';

interface QuestionItem {
  id: number;
  text: string;
  category: string;
}

interface SurveyData {
  companyName: string;
  companyLogoUrl?: string | null;
  assessmentYear: number;
  totalResponses: number;
  questions: QuestionItem[];
}

export default function PublicSurveyFillPage() {
  const params = useParams();
  const token = params?.token as string;

  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Demography
  const [division, setDivision] = useState('');
  const [jobLevel, setJobLevel] = useState('Staf / Pelaksana');
  const [tenureYears, setTenureYears] = useState<number>(3);

  // Likert Answers (Map of questionId -> score 1..5)
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchSurvey = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await api.get(`/public/surveys/${token}`);
        if (res.data?.success) {
          setSurveyData(res.data.data);
        }
      } catch (err: any) {
        setFetchError(
          err.response?.data?.error?.message ||
            'Tautan survei tidak ditemukan, belum dibuka, atau masa pengisian telah berakhir.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [token]);

  const questions = surveyData?.questions || [];
  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;
  const progressPct = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  const handleSelectScore = (questionId: number, score: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: score,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (answeredCount < totalCount) {
      alert(`Mohon lengkapi seluruh pertanyaan terlebih dahulu (${answeredCount}/${totalCount} terisi).`);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Urutkan jawaban sesuai urutan pertanyaan
      const answersArray = questions.map((q) => answers[q.id]);

      await api.post(`/public/surveys/${token}/submit`, {
        division: division.trim() || undefined,
        jobLevel: jobLevel.trim() || undefined,
        tenureYears: Number(tenureYears) || 0,
        answers: answersArray,
      });

      setIsSuccess(true);
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.error?.message || err.message || 'Gagal mengirimkan jawaban survei.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const likertOptions = [
    { value: 1, label: 'Sangat Tidak Setuju', short: 'STS', color: 'border-rose-300 hover:bg-rose-50 text-rose-800' },
    { value: 2, label: 'Tidak Setuju', short: 'TS', color: 'border-amber-300 hover:bg-amber-50 text-amber-800' },
    { value: 3, label: 'Cukup / Netral', short: 'N', color: 'border-slate-300 hover:bg-slate-50 text-slate-800' },
    { value: 4, label: 'Setuju', short: 'S', color: 'border-blue-300 hover:bg-blue-50 text-blue-800' },
    { value: 5, label: 'Sangat Setuju', short: 'SS', color: 'border-emerald-300 hover:bg-emerald-50 text-emerald-800' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        <p className="text-xs text-slate-500 font-medium">Menghubungkan ke instrumen kuesioner survei...</p>
      </div>
    );
  }

  if (fetchError || !surveyData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-border-subtle shadow-sm text-center space-y-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-full w-14 h-14 mx-auto flex items-center justify-center">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-base font-bold text-primary-900">Survei Tidak Dapat Diakses</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{fetchError}</p>
          <div className="pt-2 text-[11px] text-slate-400">
            Hubungi Tim Manajemen Risiko perusahaan Anda untuk informasi lebih lanjut.
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-emerald-200 shadow-md text-center space-y-5">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-primary-900">Terima Kasih Atas Partisipasi Anda!</h2>
            <p className="text-xs text-emerald-700 font-semibold">Tanggapan Kuesioner Berhasil Disimpan</p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Jawaban Anda telah digabungkan secara anonim ke dalam analisis indeks persepsi budaya risiko korporasi{' '}
            <strong>{surveyData.companyName}</strong> Tahun Buku {surveyData.assessmentYear}.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-center justify-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Kerahasiaan data identitas responden terjamin 100%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Sticky Mobile/Desktop Top Header */}
      <header className="bg-white border-b border-border-subtle sticky top-0 z-30 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-extrabold text-primary-900 leading-tight">
                {surveyData.companyName}
              </h1>
              <p className="text-[11px] text-slate-500">
                Survei Budaya Risiko Karyawan &bull; Tahun {surveyData.assessmentYear}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {progressPct}% Terisi
            </span>
          </div>
        </div>

        {/* Progress Line */}
        <div className="w-full bg-slate-100 h-1">
          <div
            className="bg-emerald-600 h-1 transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        {/* Intro & Confidentiality Assurance Card */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-emerald-200" />
            <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">
              Jaminan Anonimitas 100% &bull; Tanpa Akun / Login
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold leading-snug">
            Kuesioner Pengukuran Kesadaran & Budaya Risiko
          </h2>
          <p className="text-xs text-emerald-100 leading-relaxed">
            Survei ini bertujuan untuk memotret penerapan budaya risiko korporasi secara jujur dan objektif sesuai
            regulasi Kementerian BUMN (Permen PER-2/MBU/03/2023). Jawaban Anda tidak akan dikaitkan dengan identitas
            pribadi apa pun.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Demography Section */}
          <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-primary-900 uppercase tracking-wider">
                Profil Demografi Responden (Opsional / Agregat)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Direktorat / Divisi
                </label>
                <Input
                  placeholder="Contoh: Operasi / Keuangan / ERM"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenjang Jabatan
                </label>
                <select
                  value={jobLevel}
                  onChange={(e) => setJobLevel(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-border-subtle rounded-lg px-3 py-2 text-primary-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                >
                  <option value="Staf / Pelaksana">Staf / Pelaksana</option>
                  <option value="Supervisor / Officer">Supervisor / Officer</option>
                  <option value="Manajer / Assistant Manager">Manajer / Assistant Manager</option>
                  <option value="Senior Manager / VP">Senior Manager / VP</option>
                  <option value="General Manager / SVP">General Manager / SVP</option>
                  <option value="Direksi / Board">Direksi / Board</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Masa Kerja di Perusahaan (Tahun)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="45"
                  value={tenureYears}
                  onChange={(e) => setTenureYears(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Questionnaire Items */}
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const selectedValue = answers[q.id];
              const isAnswered = selectedValue !== undefined;

              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-2xl border p-5 transition-all shadow-xs ${
                    isAnswered
                      ? 'border-emerald-200 ring-1 ring-emerald-50'
                      : 'border-border-subtle'
                  }`}
                >
                  <div className="flex items-start space-x-3 mb-4">
                    <span className="h-6 w-6 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm font-bold text-primary-900 leading-snug">
                        {q.text}
                      </p>
                      {q.category && (
                        <span className="inline-block text-[10px] text-slate-400 font-semibold">
                          Indikator: {q.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Likert Scale 1-5 Radio Buttons */}
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-2">
                    {likertOptions.map((opt) => {
                      const isSelected = selectedValue === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectScore(q.id, opt.value)}
                          className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border text-center transition-all ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs scale-102 font-bold'
                              : `bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100`
                          }`}
                        >
                          <span className="text-xs sm:text-sm font-extrabold">{opt.value}</span>
                          <span className="text-[10px] sm:text-[11px] leading-tight mt-0.5 line-clamp-1">
                            {opt.short}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {submitError && (
            <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center space-x-2 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Submit Action Bar */}
          <div className="sticky bottom-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              <span>Progres Pengisian: </span>
              <strong className="text-emerald-700">
                {answeredCount} dari {totalCount} Pertanyaan Selesai
              </strong>
            </div>

            <Button
              type="submit"
              size="lg"
              variant="primary"
              disabled={submitting || answeredCount < totalCount}
              className="w-full sm:w-auto text-xs font-bold shadow-md bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="h-4 w-4 mr-1.5" />
              {submitting ? 'Mengirim Jawaban...' : 'Kirim Kuesioner Survei'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
