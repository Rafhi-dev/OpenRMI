'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { UserCheck, Plus, AlertCircle, FileCheck, CheckCircle2, Calendar, Building2, User } from 'lucide-react';

interface AssignmentItem {
  id: string;
  tenantId: string;
  periodId: string;
  consultantId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  tenant?: { name: string; code: string };
  period?: { year: number; status: string };
  consultant?: { fullName: string; email: string; username?: string };
}

export function AssignmentManagement() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [consultants, setConsultants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [selectedConsultantId, setSelectedConsultantId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, consultantsRes, assignmentsRes] = await Promise.allSettled([
        api.get('/vendor/tenants'),
        api.get('/vendor/consultants'),
        api.get('/vendor/assignments'),
      ]);

      if (tenantsRes.status === 'fulfilled' && tenantsRes.value.data?.success) {
        const raw = tenantsRes.value.data.data;
        setTenants(Array.isArray(raw) ? raw : (raw?.tenants || []));
      }
      if (consultantsRes.status === 'fulfilled' && consultantsRes.value.data?.success) {
        const raw = consultantsRes.value.data.data;
        setConsultants(Array.isArray(raw) ? raw : (raw?.consultants || []));
      }
      if (assignmentsRes.status === 'fulfilled' && assignmentsRes.value.data?.success) {
        const raw = assignmentsRes.value.data.data;
        setAssignments(Array.isArray(raw) ? raw : (raw?.assignments || []));
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat data penugasan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  const availablePeriods: any[] = selectedTenant?.periods || [];

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant?.periods && tenant.periods.length > 0) {
      setSelectedPeriodId(tenant.periods[0].id);
    } else {
      setSelectedPeriodId('');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    if (!selectedTenantId || !selectedConsultantId) {
      setFormError('Silakan pilih perusahaan klien dan konsultan asesor.');
      setFormLoading(false);
      return;
    }

    let finalPeriodId = selectedPeriodId;
    if (!finalPeriodId && selectedTenant?.periods?.length > 0) {
      finalPeriodId = selectedTenant.periods[0].id;
    }

    if (!finalPeriodId) {
      setFormError('Perusahaan klien yang dipilih belum memiliki periode observasi aktif.');
      setFormLoading(false);
      return;
    }

    try {
      await api.post('/vendor/assignments', {
        tenantId: selectedTenantId,
        periodId: finalPeriodId,
        consultantId: selectedConsultantId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Gagal membuat surat penugasan konsultan.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary-900">Engine Penugasan Asesor (Assignment Engine)</h2>
          <p className="text-xs text-slate-500">
            Terbitkan surat penugasan resmi konsultan ke perusahaan klien dan tahun buku tertentu
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Terbitkan Penugasan Baru
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
          {error}
        </div>
      )}

      {/* Card Info */}
      <div className="p-4 bg-brand-blue-50/60 rounded-lg border border-brand-blue-100 flex items-start gap-3">
        <FileCheck className="h-5 w-5 text-brand-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-brand-blue-900 leading-relaxed">
          <span className="font-bold">Invarian Penugasan & e-NDA:</span> Konsultan eksternal hanya dapat
          membuka dokumen bukti dan mengisi reviu penilaian setelah surat penugasan aktif (Assignment)
          diterbitkan oleh lembaga vendor.
        </div>
      </div>

      {/* Tabel Penugasan */}
      <div className="bg-white rounded-lg border border-border-subtle shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle">
          <h3 className="text-sm font-bold text-primary-900">Daftar Surat Penugasan Konsultan</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-primary-900">
            <thead className="bg-surface-bg border-b border-border-subtle text-xs uppercase font-semibold text-slate-600">
              <tr>
                <th className="px-6 py-3.5">Perusahaan Klien</th>
                <th className="px-6 py-3.5">Konsultan Asesor</th>
                <th className="px-6 py-3.5">Tahun Buku</th>
                <th className="px-6 py-3.5">Masa Berlaku Penugasan</th>
                <th className="px-6 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs">
                    Memuat daftar penugasan...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs">
                    Belum ada penugasan konsultan yang diterbitkan.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-bg/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-primary-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-brand-blue-600 shrink-0" />
                        <div>
                          <span>{a.tenant?.name || a.tenantId}</span>
                          {a.tenant?.code && (
                            <span className="block text-[11px] font-mono text-slate-400 font-normal">
                              {a.tenant.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-semibold text-primary-900">
                            {a.consultant?.fullName || a.consultantId}
                          </span>
                          {a.consultant?.email && (
                            <span className="block text-[11px] text-slate-400">
                              {a.consultant.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold">
                      {a.period?.year ? `Tahun ${a.period.year}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>
                          {new Date(a.startDate).toLocaleDateString('id-ID')} s.d.{' '}
                          {new Date(a.endDate).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={a.isActive ? 'success' : 'danger'}>
                        {a.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Penugasan */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Terbitkan Penugasan Konsultan Baru"
        description="Hubungkan konsultan dengan perusahaan klien dan periode tahun buku observasi"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-primary-900">
              Pilih Perusahaan Klien (Tenant) <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedTenantId}
              onChange={(e) => handleTenantSelect(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-border-strong bg-white px-3 py-2 text-sm text-primary-900 focus:border-brand-blue-600 focus:outline-none"
            >
              <option value="">-- Pilih Perusahaan Klien --</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </div>

          {availablePeriods.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-primary-900">
                Pilih Periode Penilaian (Tahun Buku) <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-border-strong bg-white px-3 py-2 text-sm text-primary-900 focus:border-brand-blue-600 focus:outline-none"
              >
                {availablePeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    Tahun {p.year} ({p.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-primary-900">
              Pilih Konsultan Asesor <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedConsultantId}
              onChange={(e) => setSelectedConsultantId(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-border-strong bg-white px-3 py-2 text-sm text-primary-900 focus:border-brand-blue-600 focus:outline-none"
            >
              <option value="">-- Pilih Konsultan Asesor --</option>
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tanggal Mulai Penugasan"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Tanggal Selesai Penugasan"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
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
              Terbitkan Penugasan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
