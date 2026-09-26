'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ChevronRight } from 'lucide-react';

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
      criteria: Array<{
        id: number;
        letterCode: string;
        level: number;
        statement: string;
      }>;
    }>;
  }>;
}

export function MasterModelsViewer() {
  const [dimensions, setDimensions] = useState<DimensionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    fetchModels();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Memuat master model regulasi...</div>;
  }

  if (error) {
    return <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-md">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-primary-900">Taksonomi Master Model Regulasi KBUMN</h2>
        <p className="text-xs text-slate-500">
          Struktur baku 5 Dimensi, Sub-Dimensi, dan 42 Parameter Permen PER-2/MBU/03/2023
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(dimensions || []).map((dim) => {
          const totalParams = (dim.subDimensions || []).reduce(
            (acc, sd) => acc + (sd.parameters || []).length,
            0
          );

          return (
            <Card key={dim.id} className="border-border-subtle">
              <CardHeader className="py-3.5 px-6 bg-surface-bg flex flex-row items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge variant="primary" className="font-bold font-mono">
                    {dim.code}
                  </Badge>
                  <CardTitle className="text-sm font-bold text-primary-900">{dim.name}</CardTitle>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {totalParams} Parameter
                </span>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {(dim.subDimensions || []).map((sd) => (
                  <div key={sd.id} className="p-3 rounded-lg border border-border-subtle/80 bg-white space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                      <ChevronRight className="h-3.5 w-3.5 text-brand-blue-600" />
                      <span>Sub-Dimensi {sd.code}: {sd.name}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5 pt-1">
                      {(sd.parameters || []).map((param) => (
                        <div
                          key={param.id}
                          className="flex items-start space-x-2 p-2 rounded bg-surface-bg text-xs text-primary-900"
                        >
                          <span className="font-mono font-bold text-brand-blue-700 bg-white px-1.5 py-0.5 rounded border border-border-subtle">
                            {param.code}
                          </span>
                          <span className="line-clamp-2 leading-tight">{param.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
