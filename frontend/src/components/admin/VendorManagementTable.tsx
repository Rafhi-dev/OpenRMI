'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Building2, Plus, Sparkles, AlertCircle } from 'lucide-react';

interface VendorItem {
  id: string;
  name: string;
  code: string;
  email: string;
  maxTenants: number;
  isActive: boolean;
  createdAt: string;
  _count?: {
    tenants: number;
    users: number;
  };
}

export function VendorManagementTable() {
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { refreshUser } = useAuth();

  // Form New Vendor State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMaxTenants, setFormMaxTenants] = useState('5');
  const [formPassword, setFormPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/vendors');
      if (res.data?.success) {
        setVendors(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal mengambil data vendor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      await api.post('/admin/vendors', {
        name: formName,
        code: formCode.toUpperCase().trim(),
        email: formEmail,
        maxTenants: parseInt(formMaxTenants, 10),
        password: formPassword || undefined,
      });

      setIsModalOpen(false);
      // Reset form
      setFormName('');
      setFormCode('');
      setFormEmail('');
      setFormPassword('');
      fetchVendors();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Gagal mendaftarkan vendor baru.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleImpersonate = async (vendorId: string) => {
    setImpersonatingId(vendorId);
    setError(null);
    try {
      const res = await api.post(`/admin/vendors/${vendorId}/impersonate`);
      if (res.data?.success) {
        // Refresh profil di context sehingga isImpersonating terbaca
        await refreshUser();
        // Redirect ke dashboard vendor
        router.push('/vendor');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memulai sesi impersonasi vendor.');
      setImpersonatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary-900">Manajemen Lembaga Vendor Asesor</h2>
          <p className="text-xs text-slate-500">
            Kelola izin institusi konsultan penilai dan gunakan mode impersonasi untuk supervisi
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Daftarkan Vendor Baru
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabel Vendor */}
      <div className="bg-white rounded-lg border border-border-subtle shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-primary-900">
            <thead className="bg-surface-bg border-b border-border-subtle text-xs uppercase font-semibold text-slate-600">
              <tr>
                <th className="px-6 py-3.5">Lembaga / Kantor Vendor</th>
                <th className="px-6 py-3.5">Kode</th>
                <th className="px-6 py-3.5">Email Administrator</th>
                <th className="px-6 py-3.5 text-center">Batas Kuota Klien</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi Supervisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-xs">
                    Memuat data vendor...
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-xs">
                    Belum ada lembaga vendor terdaftar.
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-surface-bg/50 transition-colors">
                    <td className="px-6 py-4 font-semibold flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-amber-50 text-amber-700">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <span>{vendor.name}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600">{vendor.code}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{vendor.email}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-semibold text-primary-900">
                        {vendor._count?.tenants ?? 0}
                      </span>
                      <span className="text-slate-400 text-xs"> / {vendor.maxTenants}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={vendor.isActive ? 'success' : 'danger'}>
                        {vendor.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={impersonatingId === vendor.id}
                        onClick={() => handleImpersonate(vendor.id)}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-1 h-8"
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        Impersonate
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pendaftaran Vendor */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Daftarkan Lembaga Vendor Baru"
        description="Buat akun lembaga konsultan penilai independen dan tentukan batas kuota klien"
      >
        <form onSubmit={handleCreateVendor} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
              {formError}
            </div>
          )}

          <Input
            label="Nama Lembaga / Kantor Konsultan"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="PT Sucofindo Asesmen Risiko"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Kode Vendor (Unik)"
              required
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              placeholder="SUCOFINDO"
            />
            <Input
              label="Batas Maksimum Klien (Quota)"
              type="number"
              min="1"
              max="100"
              required
              value={formMaxTenants}
              onChange={(e) => setFormMaxTenants(e.target.value)}
            />
          </div>

          <Input
            label="Email Administrator Vendor"
            type="email"
            required
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            placeholder="admin@sucofindo.co.id"
          />

          <Input
            label="Kata Sandi Awal"
            type="password"
            required
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
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
              Simpan & Daftarkan Vendor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
