'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HardDrive, Check, AlertCircle } from 'lucide-react';

export function UploadSettingsForm() {
  const [maxSize, setMaxSize] = useState<string>('50');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/system/settings');
      if (res.data?.success) {
        setMaxSize(String(res.data.data.maxUploadFileSizeMb || 50));
      }
    } catch {
      // Default to 50
      setMaxSize('50');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const val = parseInt(maxSize, 10);
    if (isNaN(val) || val < 1 || val > 500) {
      setErrorMsg('Batas ukuran file harus berada dalam rentang 1 s.d. 500 MB.');
      setSaving(false);
      return;
    }

    try {
      const res = await api.put('/admin/system/settings', {
        maxUploadFileSizeMb: val,
      });
      if (res.data?.success) {
        setSuccessMsg(`Batas ukuran berkas unggahan berhasil diubah menjadi ${val} MB.`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Gagal memperbarui batas ukuran berkas.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Memuat pengaturan sistem...</div>;
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-primary-900">
          <HardDrive className="h-5 w-5 text-indigo-600" />
          Batas Ukuran Unggahan Berkas (Storage Policy)
        </CardTitle>
        <p className="text-xs text-slate-500">
          Tentukan batas maksimum ukuran berkas bukti dukung dan dokumen tambahan yang diunggah oleh Counterpart
        </p>
      </CardHeader>

      <CardContent>
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-md flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Batas Maksimum per Berkas (Megabytes / MB)"
            type="number"
            min="1"
            max="500"
            required
            value={maxSize}
            onChange={(e) => setMaxSize(e.target.value)}
            helperText="Nilai diperbolehkan antara 1 MB hingga 500 MB (Default: 50 MB)."
          />

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" size="sm" isLoading={saving}>
              Simpan Kebijakan Ukuran
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
