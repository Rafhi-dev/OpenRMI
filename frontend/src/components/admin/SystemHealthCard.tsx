'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Database, Server, HardDrive, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

interface HealthData {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  services: {
    database: { status: string; latencyMs: number };
    redis: { status: string; latencyMs: number };
    storage: { status: string; latencyMs: number; bucket: string };
  };
  system: {
    nodeVersion: string;
    memoryUsageMb: { heapUsed: number; heapTotal: number; rss: number };
  };
}

export function SystemHealthCard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/system/health');
      if (res.data?.success) {
        setHealth(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal memuat status kesehatan sistem.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary-900">Diagnostik Kesehatan Infrastruktur</h2>
          <p className="text-xs text-slate-500">
            Monitoring koneksi PostgreSQL 18, Redis Cache, dan Object Storage S3/R2
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHealth} isLoading={loading}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Refresh Status
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
          {error}
        </div>
      )}

      {health && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Database */}
          <Card className="border-border-subtle">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-surface-bg/50">
              <CardTitle className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1.5">
                <Database className="h-4 w-4 text-brand-blue-600" />
                PostgreSQL 18 (RLS)
              </CardTitle>
              {health.services.database.status === 'CONNECTED' ? (
                <span className="flex items-center text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> ONLINE
                </span>
              ) : (
                <span className="flex items-center text-xs font-bold text-rose-600">
                  <XCircle className="h-4 w-4 mr-1" /> ERROR
                </span>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary-900">
                {health.services.database.latencyMs} ms
              </div>
              <p className="text-xs text-slate-500 mt-1">Latensi query database</p>
            </CardContent>
          </Card>

          {/* Redis */}
          <Card className="border-border-subtle">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-surface-bg/50">
              <CardTitle className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1.5">
                <Server className="h-4 w-4 text-amber-600" />
                Redis Cache & Queue
              </CardTitle>
              {health.services.redis.status === 'CONNECTED' ? (
                <span className="flex items-center text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> ONLINE
                </span>
              ) : (
                <span className="flex items-center text-xs font-bold text-rose-600">
                  <XCircle className="h-4 w-4 mr-1" /> ERROR
                </span>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary-900">
                {health.services.redis.latencyMs} ms
              </div>
              <p className="text-xs text-slate-500 mt-1">Latensi respon in-memory cache</p>
            </CardContent>
          </Card>

          {/* Storage */}
          <Card className="border-border-subtle">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-surface-bg/50">
              <CardTitle className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-indigo-600" />
                S3 / Cloudflare R2
              </CardTitle>
              {health.services.storage.status === 'CONNECTED' ? (
                <span className="flex items-center text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> ONLINE
                </span>
              ) : (
                <span className="flex items-center text-xs font-bold text-rose-600">
                  <XCircle className="h-4 w-4 mr-1" /> ERROR
                </span>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary-900">
                {health.services.storage.latencyMs} ms
              </div>
              <p className="text-xs text-slate-500 mt-1">Bucket: {health.services.storage.bucket}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
