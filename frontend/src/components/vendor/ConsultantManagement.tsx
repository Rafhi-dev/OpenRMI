'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { UserCheck, Plus, AlertCircle, Award } from 'lucide-react';

interface ConsultantItem {
  id: string;
  fullName: string;
  username: string | null;
  email: string;
  agencyName: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    assignments: number;
  };
}

export function ConsultantManagement() {
  const [consultants, setConsultants] = useState<ConsultantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [password, setPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchConsultants = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vendor/consultants');
      if (res.data?.success) {
        setConsultants(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat tim konsultan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultants();
  }, []);

  const handleCreateConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      await api.post('/vendor/consultants', {
        fullName,
        username: username.trim() || undefined,
        email,
        agencyName: agencyName.trim() || undefined,
        password,
      });

      setIsModalOpen(false);
      setFullName('');
      setUsername('');
      setEmail('');
      setAgencyName('');
      setPassword('');
      fetchConsultants();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Gagal mendaftarkan akun konsultan.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary-900">Manajemen Tim Konsultan Asesor</h2>
          <p className="text-xs text-slate-500">
            Daftarkan asesor independen yang bertugas melakukan penilaian 42 parameter
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Daftarkan Asesor Baru
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
          {error}
        </div>
      )}

      {/* Tabel Konsultan */}
      <div className="bg-white rounded-lg border border-border-subtle shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-primary-900">
            <thead className="bg-surface-bg border-b border-border-subtle text-xs uppercase font-semibold text-slate-600">
              <tr>
                <th className="px-6 py-3.5">Nama Asesor</th>
                <th className="px-6 py-3.5">Username</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Instansi / Sertifikasi</th>
                <th className="px-6 py-3.5 text-center">Penugasan Aktif</th>
                <th className="px-6 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-xs">
                    Memuat data konsultan...
                  </td>
                </tr>
              ) : consultants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-xs">
                    Belum ada konsultan asesor yang didaftarkan.
                  </td>
                </tr>
              ) : (
                consultants.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-bg/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-primary-900 flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <span>{c.fullName}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600">{c.username || '-'}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{c.email}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {c.agencyName ? (
                        <span className="flex items-center gap-1">
                          <Award className="h-3.5 w-3.5 text-amber-500" />
                          {c.agencyName}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-xs text-brand-blue-600">
                      {c._count?.assignments ?? 0} Proyek
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={c.isActive ? 'success' : 'danger'}>
                        {c.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pendaftaran Konsultan */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Daftarkan Konsultan Asesor Baru"
        description="Akun ini akan memiliki hak akses reviu bukti dan penilaian 42 parameter"
      >
        <form onSubmit={handleCreateConsultant} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Nama Lengkap & Gelar Asesor"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Dr. Hendra Wijaya, CRMO, QRMO"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Username Akun (Unik)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="assessor_hendra"
            />
            <Input
              label="Gelar / No. Sertifikasi"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="CRMO BNSP - IRMAPA"
            />
          </div>

          <Input
            label="Email Asesor"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hendra@konsultan.com"
          />

          <Input
            label="Kata Sandi Awal"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 8 karakter"
          />

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-border-subtle">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={formLoading}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={formLoading}>
              Daftarkan Asesor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
