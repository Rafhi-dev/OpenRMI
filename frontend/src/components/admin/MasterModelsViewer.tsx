'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import {
  BookOpen,
  ChevronRight,
  Search,
  FileText,
  Layers,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Edit2,
  Save,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface CriterionItem {
  id: number;
  letterCode: string;
  level: number;
  statement: string;
  guidanceNotes?: string | null;
  defaultEvidences?: string | null;
}

interface ParameterItem {
  id: number;
  code: string;
  title: string;
  description?: string | null;
  criteria: CriterionItem[];
  subDimCode?: string;
  subDimName?: string;
  dimCode?: string;
  dimName?: string;
}

interface DimensionItem {
  id: number;
  code: string;
  name: string;
  subDimensions: Array<{
    id: number;
    code: string;
    name: string;
    parameters: Array<{
      id: number;
      code: string;
      title: string;
      description?: string | null;
      criteria: CriterionItem[];
    }>;
  }>;
}

export function MasterModelsViewer() {
  const [dimensions, setDimensions] = useState<DimensionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Detail Modal
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParam, setSelectedParam] = useState<ParameterItem | null>(null);

  // Modals Edit State
  const [editDimension, setEditDimension] = useState<{ id: number; code: string; name: string } | null>(null);
  const [editSubDimension, setEditSubDimension] = useState<{ id: number; code: string; name: string } | null>(null);
  const [editParameter, setEditParameter] = useState<{ id: number; code: string; title: string; description: string } | null>(null);
  const [editCriterion, setEditCriterion] = useState<{
    id: number;
    letterCode: string;
    statement: string;
    guidanceNotes: string;
    defaultEvidences: string;
  } | null>(null);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const fetchModels = async () => {
    try {
      const res = await api.get('/admin/master-models');
      if (res.data?.success) {
        setDimensions(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat master model regulasi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // Clear toast notifications after 4s
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  // Handlers for Editing
  const handleSaveDimension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDimension) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      await api.put(`/admin/master-models/dimension/${editDimension.id}`, {
        name: editDimension.name,
      });
      setSaveSuccess(`Dimensi ${editDimension.code} berhasil diperbarui.`);
      setEditDimension(null);
      await fetchModels();
    } catch (err: any) {
      setSaveError(err.response?.data?.error?.message || 'Gagal memperbarui dimensi.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveSubDimension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubDimension) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      await api.put(`/admin/master-models/sub-dimension/${editSubDimension.id}`, {
        name: editSubDimension.name,
      });
      setSaveSuccess(`Sub-Dimensi ${editSubDimension.code} berhasil diperbarui.`);
      setEditSubDimension(null);
      await fetchModels();
    } catch (err: any) {
      setSaveError(err.response?.data?.error?.message || 'Gagal memperbarui sub-dimensi.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveParameter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editParameter) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      await api.put(`/admin/master-models/parameter/${editParameter.id}`, {
        title: editParameter.title,
        description: editParameter.description,
      });
      setSaveSuccess(`Parameter ${editParameter.code} berhasil diperbarui.`);
      if (selectedParam && selectedParam.id === editParameter.id) {
        setSelectedParam((prev) =>
          prev ? { ...prev, title: editParameter.title, description: editParameter.description } : null
        );
      }
      setEditParameter(null);
      await fetchModels();
    } catch (err: any) {
      setSaveError(err.response?.data?.error?.message || 'Gagal memperbarui parameter.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCriterion) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      await api.put(`/admin/master-models/criterion/${editCriterion.id}`, {
        statement: editCriterion.statement,
        defaultEvidences: editCriterion.defaultEvidences,
        guidanceNotes: editCriterion.guidanceNotes,
      });
      setSaveSuccess(`Kriteria ${editCriterion.letterCode} berhasil diperbarui.`);
      if (selectedParam) {
        setSelectedParam((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            criteria: prev.criteria.map((c) =>
              c.id === editCriterion.id
                ? {
                    ...c,
                    statement: editCriterion.statement,
                    defaultEvidences: editCriterion.defaultEvidences,
                    guidanceNotes: editCriterion.guidanceNotes,
                  }
                : c
            ),
          };
        });
      }
      setEditCriterion(null);
      await fetchModels();
    } catch (err: any) {
      setSaveError(err.response?.data?.error?.message || 'Gagal memperbarui kriteria.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Summary counts
  const totalStats = useMemo(() => {
    let subDimCount = 0;
    let paramCount = 0;
    let critCount = 0;

    (dimensions || []).forEach((dim) => {
      (dim.subDimensions || []).forEach((sd) => {
        subDimCount++;
        (sd.parameters || []).forEach((p) => {
          paramCount++;
          critCount += (p.criteria || []).length;
        });
      });
    });

    return {
      dimCount: (dimensions || []).length,
      subDimCount,
      paramCount,
      critCount,
    };
  }, [dimensions]);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Memuat taksonomi 42 parameter regulasi KBUMN...
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-md">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert Success */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{saveSuccess}</span>
        </div>
      )}

      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-primary-900">Taksonomi Master Model Regulasi KBUMN</h2>
            <Badge variant="primary" className="text-[10px]">
              Full Edit Mode Admin
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Struktur baku 5 Dimensi, 15 Sub-Dimensi, 42 Parameter & 281 Kriteria Permen PER-2/MBU/03/2023 & Juknis 8
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari parameter atau dokumen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-border-subtle rounded-lg text-xs text-primary-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-xs">
          <div className="flex items-center space-x-2 text-brand-blue-600 mb-1">
            <Layers className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Dimensi Baku
            </span>
          </div>
          <div className="text-2xl font-black text-primary-900">{totalStats.dimCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">D1 s.d. D5 KBUMN</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-xs">
          <div className="flex items-center space-x-2 text-indigo-600 mb-1">
            <BookOpen className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Sub-Dimensi
            </span>
          </div>
          <div className="text-2xl font-black text-primary-900">{totalStats.subDimCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Struktur tata kelola & proses</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-xs">
          <div className="flex items-center space-x-2 text-emerald-600 mb-1">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Parameter RMI
            </span>
          </div>
          <div className="text-2xl font-black text-primary-900">{totalStats.paramCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">P01 s.d. P42 Lengkap</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-xs">
          <div className="flex items-center space-x-2 text-purple-600 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Kriteria & Eviden
            </span>
          </div>
          <div className="text-2xl font-black text-primary-900">{totalStats.critCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Beserta standar dokumen Kolom I</p>
        </div>
      </div>

      {/* Dimensi & Parameter List */}
      <div className="grid grid-cols-1 gap-5">
        {(dimensions || []).map((dim) => {
          const totalParams = (dim.subDimensions || []).reduce(
            (acc, sd) => acc + (sd.parameters || []).length,
            0
          );

          return (
            <Card key={dim.id} className="border-border-subtle overflow-hidden">
              <CardHeader className="py-3.5 px-6 bg-slate-50 border-b border-border-subtle flex flex-row items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge variant="primary" className="font-extrabold font-mono text-xs">
                    {dim.code}
                  </Badge>
                  <CardTitle className="text-sm font-bold text-primary-900">{dim.name}</CardTitle>
                  <button
                    onClick={() => setEditDimension({ id: dim.id, code: dim.code, name: dim.name })}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-primary-900 transition-colors"
                    title={`Edit Nama Dimensi ${dim.code}`}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-full border border-border-subtle">
                  {totalParams} Parameter
                </span>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {(dim.subDimensions || []).map((sd) => {
                  const filteredParams = (sd.parameters || []).filter((p) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    const matchParam =
                      p.code.toLowerCase().includes(q) || p.title.toLowerCase().includes(q);
                    const matchCrit = (p.criteria || []).some(
                      (c) =>
                        c.statement.toLowerCase().includes(q) ||
                        (c.defaultEvidences && c.defaultEvidences.toLowerCase().includes(q))
                    );
                    return matchParam || matchCrit;
                  });

                  if (filteredParams.length === 0 && searchQuery.trim()) return null;

                  return (
                    <div
                      key={sd.id}
                      className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <div className="flex items-center space-x-2">
                          <ChevronRight className="h-4 w-4 text-brand-blue-600 shrink-0" />
                          <span>
                            Sub-Dimensi {sd.code}: {sd.name}
                          </span>
                        </div>
                        <button
                          onClick={() => setEditSubDimension({ id: sd.id, code: sd.code, name: sd.name })}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-brand-blue-600 transition-colors flex items-center space-x-1 text-[11px] font-semibold"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-6">
                        {filteredParams.map((param) => (
                          <div
                            key={param.id}
                            onClick={() =>
                              setSelectedParam({
                                ...param,
                                subDimCode: sd.code,
                                subDimName: sd.name,
                                dimCode: dim.code,
                                dimName: dim.name,
                              })
                            }
                            className="flex items-start justify-between p-3 rounded-lg border border-border-subtle/80 bg-surface-bg/40 hover:bg-brand-blue-50/50 hover:border-brand-blue-300 cursor-pointer transition-all group"
                          >
                            <div className="flex items-start space-x-2.5 min-w-0 pr-2">
                              <span className="font-mono font-bold text-xs text-brand-blue-700 bg-white px-2 py-0.5 rounded border border-border-subtle shrink-0">
                                {param.code}
                              </span>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-primary-900 group-hover:text-brand-blue-700 transition-colors line-clamp-2 leading-tight">
                                  {param.title}
                                </h4>
                                <p className="text-[11px] text-slate-400 mt-1">
                                  {(param.criteria || []).length} Kriteria Penilaian
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-brand-blue-600 shrink-0 mt-0.5" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal Detail Kriteria & Standar Dokumen Parameter */}
      {selectedParam && (
        <Modal
          isOpen={!!selectedParam}
          onClose={() => setSelectedParam(null)}
          title={`Detail ${selectedParam.code}: ${selectedParam.title}`}
          description={`${selectedParam.dimCode} - ${selectedParam.dimName} • Sub-Dimensi ${selectedParam.subDimCode}: ${selectedParam.subDimName}`}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="p-3 bg-brand-blue-50/70 border border-brand-blue-200 rounded-lg text-xs text-brand-blue-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Info className="h-4 w-4 text-brand-blue-600 shrink-0" />
                <span>
                  Admin dapat mengedit judul parameter maupun rincian kriteria & dokumen standar berikut.
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setEditParameter({
                    id: selectedParam.id,
                    code: selectedParam.code,
                    title: selectedParam.title,
                    description: selectedParam.description || '',
                  })
                }
                className="text-xs shrink-0"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit Parameter
              </Button>
            </div>

            <div className="space-y-3">
              {(selectedParam.criteria || []).map((crit) => (
                <div
                  key={crit.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2.5 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300">
                        Kriteria {crit.letterCode}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Level {crit.level}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        setEditCriterion({
                          id: crit.id,
                          letterCode: crit.letterCode,
                          statement: crit.statement,
                          guidanceNotes: crit.guidanceNotes || '',
                          defaultEvidences: crit.defaultEvidences || '',
                        })
                      }
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-brand-blue-600 transition-colors flex items-center space-x-1 text-[11px] font-semibold"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit Kriteria</span>
                    </button>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-slate-800 leading-snug">
                      Pernyataan Kriteria Penilaian:
                    </h5>
                    <p className="text-xs text-slate-700 leading-relaxed mt-1">
                      {crit.statement}
                    </p>
                  </div>

                  {crit.defaultEvidences && (
                    <div className="pt-2 border-t border-slate-100 bg-slate-50/80 p-3 rounded-lg border text-xs space-y-1">
                      <div className="flex items-center space-x-1.5 font-bold text-slate-700">
                        <FileText className="h-3.5 w-3.5 text-brand-blue-600" />
                        <span>Standar Dokumen Yang Harus Disiapkan (Kolom H & I):</span>
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line">
                        {crit.defaultEvidences}
                      </p>
                    </div>
                  )}

                  {crit.guidanceNotes && (
                    <p className="text-[11px] text-slate-400 italic">
                      Petunjuk: {crit.guidanceNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 1: Edit Dimensi */}
      {editDimension && (
        <Modal
          isOpen={!!editDimension}
          onClose={() => setEditDimension(null)}
          title={`Edit Dimensi ${editDimension.code}`}
          description="Perbarui nama resmi Dimensi acuan regulasi KBUMN"
        >
          <form onSubmit={handleSaveDimension} className="space-y-4">
            {saveError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-md">{saveError}</div>
            )}
            <Input
              label="Nama Dimensi"
              value={editDimension.name}
              onChange={(e) => setEditDimension({ ...editDimension, name: e.target.value })}
              required
            />
            <div className="flex justify-end space-x-2 pt-3 border-t border-border-subtle">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditDimension(null)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={saveLoading}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal 2: Edit Sub-Dimensi */}
      {editSubDimension && (
        <Modal
          isOpen={!!editSubDimension}
          onClose={() => setEditSubDimension(null)}
          title={`Edit Sub-Dimensi ${editSubDimension.code}`}
          description="Perbarui nama pengelompokan Sub-Dimensi tata kelola risiko"
        >
          <form onSubmit={handleSaveSubDimension} className="space-y-4">
            {saveError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-md">{saveError}</div>
            )}
            <Input
              label="Nama Sub-Dimensi"
              value={editSubDimension.name}
              onChange={(e) => setEditSubDimension({ ...editSubDimension, name: e.target.value })}
              required
            />
            <div className="flex justify-end space-x-2 pt-3 border-t border-border-subtle">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditSubDimension(null)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={saveLoading}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal 3: Edit Parameter */}
      {editParameter && (
        <Modal
          isOpen={!!editParameter}
          onClose={() => setEditParameter(null)}
          title={`Edit Parameter ${editParameter.code}`}
          description="Perbarui judul dan deskripsi acuan parameter RMI"
        >
          <form onSubmit={handleSaveParameter} className="space-y-4">
            {saveError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-md">{saveError}</div>
            )}
            <Input
              label="Judul Parameter"
              value={editParameter.title}
              onChange={(e) => setEditParameter({ ...editParameter, title: e.target.value })}
              required
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-primary-900">Deskripsi Parameter</label>
              <textarea
                rows={3}
                value={editParameter.description}
                onChange={(e) => setEditParameter({ ...editParameter, description: e.target.value })}
                className="w-full bg-white border border-border-subtle rounded-lg p-2.5 text-xs text-primary-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-3 border-t border-border-subtle">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditParameter(null)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={saveLoading}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal 4: Edit Kriteria & Standar Dokumen */}
      {editCriterion && (
        <Modal
          isOpen={!!editCriterion}
          onClose={() => setEditCriterion(null)}
          title={`Edit Kriteria ${editCriterion.letterCode}`}
          description="Perbarui pernyataan kriteria serta standar dokumen pemenuhan (Kolom H & I)"
        >
          <form onSubmit={handleSaveCriterion} className="space-y-4">
            {saveError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-md">{saveError}</div>
            )}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-primary-900">
                Pernyataan Kriteria Penilaian *
              </label>
              <textarea
                rows={3}
                required
                value={editCriterion.statement}
                onChange={(e) => setEditCriterion({ ...editCriterion, statement: e.target.value })}
                className="w-full bg-white border border-border-subtle rounded-lg p-2.5 text-xs text-primary-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-primary-900">
                Standar Dokumen Yang Harus Disiapkan (Kolom H & I)
              </label>
              <textarea
                rows={4}
                value={editCriterion.defaultEvidences}
                onChange={(e) =>
                  setEditCriterion({ ...editCriterion, defaultEvidences: e.target.value })
                }
                className="w-full bg-white border border-border-subtle rounded-lg p-2.5 text-xs text-primary-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
              />
            </div>

            <Input
              label="Petunjuk Pemenuhan (Guidance Notes)"
              value={editCriterion.guidanceNotes}
              onChange={(e) => setEditCriterion({ ...editCriterion, guidanceNotes: e.target.value })}
            />

            <div className="flex justify-end space-x-2 pt-3 border-t border-border-subtle">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditCriterion(null)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={saveLoading}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
