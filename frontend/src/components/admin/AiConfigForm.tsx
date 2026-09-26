'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cpu, Sparkles, Check, AlertCircle } from 'lucide-react';

interface AiConfigData {
  deepseekModel?: string;
  activeLlmModel?: string;
  thinkingMode: boolean;
  jinaModel?: string;
  activeEmbeddingModel?: string;
  temperature: number;
  maxTokens: number;
  deepseekApiKeyMasked?: string;
  jinaApiKeyMasked?: string;
  mineruApiKeyMasked?: string;
}

export function AiConfigForm() {
  const [config, setConfig] = useState<AiConfigData>({
    deepseekModel: 'deepseek-flash',
    thinkingMode: true,
    jinaModel: 'jina-embeddings-v4',
    temperature: 0.2,
    maxTokens: 4096,
  });
  const [deepseekApiKey, setDeepseekApiKey] = useState('');
  const [jinaApiKey, setJinaApiKey] = useState('');
  const [mineruApiKey, setMineruApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/ai-config');
      if (res.data?.success) {
        const d = res.data.data;
        setConfig({
          ...d,
          deepseekModel: d.activeLlmModel || d.deepseekModel || 'deepseek-flash',
          jinaModel: d.activeEmbeddingModel || d.jinaModel || 'jina-embeddings-v4',
        });
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Gagal mengambil konfigurasi AI.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const payload: any = {
        activeLlmModel: config.deepseekModel,
        thinkingMode: config.thinkingMode,
        activeEmbeddingModel: config.jinaModel,
        temperature: Number(config.temperature),
        maxTokens: Number(config.maxTokens),
      };

      if (deepseekApiKey.trim()) {
        payload.deepseekApiKey = deepseekApiKey.trim();
      }
      if (jinaApiKey.trim()) {
        payload.jinaApiKey = jinaApiKey.trim();
      }
      if (mineruApiKey.trim()) {
        payload.mineruApiKey = mineruApiKey.trim();
      }

      const res = await api.put('/admin/ai-config', payload);
      if (res.data?.success) {
        setSuccessMsg('Konfigurasi kecerdasan buatan (AI) global berhasil diperbarui.');
        setDeepseekApiKey('');
        setJinaApiKey('');
        setMineruApiKey('');
        fetchConfig();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Gagal menyimpan konfigurasi AI.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Memuat konfigurasi AI...</div>;
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-primary-900">
          <Cpu className="h-5 w-5 text-brand-blue-600" />
          Konfigurasi Terpusat AI Reasoning & Embeddings
        </CardTitle>
        <p className="text-xs text-slate-500">
          Atur mesin inferensi DeepSeek LLM dan Jina AI Embeddings untuk asistensi penilaian kriteria
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

        <form onSubmit={handleSave} className="space-y-5">
          {/* DeepSeek Model Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-primary-900">
              Model Utama DeepSeek LLM
            </label>
            <select
              value={config.deepseekModel}
              onChange={(e) => setConfig({ ...config, deepseekModel: e.target.value })}
              className="flex h-10 w-full rounded-md border border-border-strong bg-white px-3 py-2 text-sm text-primary-900 focus:border-brand-blue-600 focus:outline-none"
            >
              <option value="deepseek-flash">DeepSeek-V4.1-Flash (Inferensi Cepat & Efisien)</option>
              <option value="deepseek-v4-pro">DeepSeek-V4-Pro (Penalaran Kompleks Berantai)</option>
            </select>
          </div>

          {/* Thinking Mode Switch */}
          <div className="flex items-center justify-between p-3.5 bg-surface-bg rounded-lg border border-border-subtle">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-primary-900 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                Thinking Mode (Chain-of-Thought Audit)
              </span>
              <p className="text-[11px] text-slate-500">
                AI akan menyertakan alur logika pertimbangan sebelum memberikan rekomendasi nilai
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.thinkingMode}
                onChange={(e) => setConfig({ ...config, thinkingMode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue-600"></div>
            </label>
          </div>

          {/* Jina Embeddings Model */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-primary-900">
              Model Semantic Embedding (Jina AI)
            </label>
            <select
              value={config.jinaModel}
              onChange={(e) => setConfig({ ...config, jinaModel: e.target.value })}
              className="flex h-10 w-full rounded-md border border-border-strong bg-white px-3 py-2 text-sm text-primary-900 focus:border-brand-blue-600 focus:outline-none"
            >
              <option value="jina-embeddings-v4">Jina Embeddings v4 (Multimodal & Konteks 8K)</option>
              <option value="jina-embeddings-v3">Jina Embeddings v3</option>
            </select>
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Temperature (0.0 - 1.0)"
              type="number"
              step="0.05"
              min="0.0"
              max="1.0"
              value={config.temperature}
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
            />
            <Input
              label="Max Output Tokens"
              type="number"
              min="512"
              max="8192"
              value={config.maxTokens}
              onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value, 10) })}
            />
          </div>

          {/* API Keys Masked */}
          <div className="pt-2 border-t border-border-subtle space-y-3">
            <p className="text-xs font-semibold text-slate-700">Kredensial API Key (Opsional Diperbarui)</p>
            <Input
              label="DeepSeek API Key"
              type="password"
              placeholder={config.deepseekApiKeyMasked || 'sk-••••••••••••••••'}
              value={deepseekApiKey}
              onChange={(e) => setDeepseekApiKey(e.target.value)}
              helperText="Kosongkan jika tidak ingin mengubah kunci API saat ini."
            />
            <Input
              label="Jina AI API Key (Semantic Embeddings)"
              type="password"
              placeholder={config.jinaApiKeyMasked || 'jina_••••••••••••••••'}
              value={jinaApiKey}
              onChange={(e) => setJinaApiKey(e.target.value)}
              helperText="Kosongkan jika tidak ingin mengubah kunci API saat ini."
            />
            <Input
              label="MinerU API Key (PDF & Table Extraction)"
              type="password"
              placeholder={config.mineruApiKeyMasked || 'sk-••••••••••••••••'}
              value={mineruApiKey}
              onChange={(e) => setMineruApiKey(e.target.value)}
              helperText="Kosongkan jika tidak ingin mengubah kunci API saat ini."
            />
          </div>

          <div className="flex justify-end pt-3">
            <Button type="submit" variant="primary" size="sm" isLoading={saving}>
              Simpan Konfigurasi AI
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
