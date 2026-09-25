'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { UserCheck, Plus, AlertCircle, FileCheck, CheckCircle2 } from 'lucide-react';

interface AssignmentItem {
  id: string;
  tenantId: string;
  periodId: string;
  consultantId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  tenant: { name: string; code: string };
  period: { year: number; status: string };
  consultant: { fullName: string; email: string };
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
  const [assessmentYear, setAssessmentYear] = useState(new Date().getFullYear().toString());
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
      const [tenantsRes, consultantsRes] = await Promise.all([
        api.get('/vendor/tenants'),
        api.get('/vendor/consultants'),
      ]);

      if (tenantsRes.data?.success) setTenants(tenantsRes.data.data);
      if (consultantsRes.data?.success) setConsultants(consultantsRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat data penugasan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    if (!selectedTenantId || !selectedConsultantId) {
      setFormError('Silakan pilih perusahaan klien dan konsultan asesor.');
      setFormLoading(false);
      return;
    }

    try {
      await api.post('/vendor/assignments', {
        tenantId: selectedTenantId,
        year: parseInt(assessmentYear, 10),
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
              onChange={(e) => setSelectedTenantId(e.target.value)}
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

          <Input
            label="Tahun Buku Observasi Asesmen"
            type="number"
            min="2020"
            max="2035"
            required
            value={assessmentYear}
            onChange={(e) => setAssessmentYear(e.target.value)}
          />

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
              <option value="">-- Pilih Asesor --</option>
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tanggal Mulai Tugas"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Tanggal Berakhir Tugas"
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
