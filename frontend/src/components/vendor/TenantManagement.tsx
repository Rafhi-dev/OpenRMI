'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Briefcase, Plus, AlertCircle, Building } from 'lucide-react';

interface TenantItem {
  id: string;
  name: string;
  code: string;
  industryCluster: string;
  createdAt: string;
  _count?: {
    periods: number;
    users: number;
  };
}

export function TenantManagement() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [industryCluster, setIndustryCluster] = useState('UMUM');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vendor/tenants');
      if (res.data?.success) {
        setTenants(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat daftar tenant.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      await api.post('/vendor/tenants', {
        name,
        code: code.toUpperCase().trim(),
        industryCluster,
      });

      setIsModalOpen(false);
      setName('');
      setCode('');
      setIndustryCluster('UMUM');
      fetchTenants();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Gagal mendaftarkan tenant klien baru.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary-900">Manajemen Perusahaan Klien (Tenants)</h2>
          <p className="text-xs text-slate-500">
            Daftarkan BUMN atau entitas korporasi di bawah portofolio lembaga Anda
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Daftarkan Perusahaan Klien
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
          {error}
        </div>
      )}

      {/* Tabel Tenants */}
      <div className="bg-white rounded-lg border border-border-subtle shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-primary-900">
            <thead className="bg-surface-bg border-b border-border-subtle text-xs uppercase font-semibold text-slate-600">
              <tr>
                <th className="px-6 py-3.5">Nama Perusahaan Klien</th>
                <th className="px-6 py-3.5">Kode Identitas</th>
                <th className="px-6 py-3.5">Klaster Industri</th>
                <th className="px-6 py-3.5 text-center">Total Siklus Asesmen</th>
                <th className="px-6 py-3.5 text-center">Akun Counterpart</th>
                <th className="px-6 py-3.5 text-right">Terdaftar Pada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-xs">
                    Memuat data klien...
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-xs">
                    Belum ada perusahaan klien yang didaftarkan.
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-bg/50 transition-colors">
                    <td className="px-6 py-4 font-semibold flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-brand-blue-50 text-brand-blue-600">
                        <Building className="h-4 w-4" />
                      </div>
                      <span>{t.name}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600">{t.code}</td>
                    <td className="px-6 py-4 text-xs">
                      <Badge variant="outline">{t.industryCluster}</Badge>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-xs">
                      {t._count?.periods ?? 0}
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-slate-500">
                      {t._count?.users ?? 0} pengguna
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pendaftaran Tenant */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Daftarkan Perusahaan Klien Baru"
        description="Pastikan kuota lisensi vendor masih mencukupi untuk mendaftarkan klien baru"
      >
        <form onSubmit={handleCreateTenant} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Nama Lengkap Perusahaan BUMN / Swasta"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="PT Bio Farma (Persero)"
          />

          <Input
            label="Kode Singkatan Perusahaan (Unik)"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="BIOFARMA"
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-primary-900">
              Klaster Industri KBUMN
            </label>
            <select
              value={industryCluster}
              onChange={(e) => setIndustryCluster(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border-strong bg-white px-3 py-2 text-sm text-primary-900 focus:border-brand-blue-600 focus:outline-none"
            >
              <option value="UMUM">Industri Umum / Non-Keuangan (42 Parameter)</option>
              <option value="PERBANKAN">Industri Jasa Keuangan & Perbankan (42 Parameter)</option>
              <option value="ASURANSI">Industri Asuransi & Penjaminan (41 Parameter)</option>
            </select>
          </div>

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
              Daftarkan Klien
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
