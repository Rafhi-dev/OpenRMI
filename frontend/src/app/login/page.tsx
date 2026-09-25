'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Eye, EyeOff, AlertCircle, Building2, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identity.trim()) {
      setErrorMessage('Silakan masukkan Username atau Email Anda.');
      return;
    }

    if (!password) {
      setErrorMessage('Silakan masukkan kata sandi.');
      return;
    }

    setIsLoading(true);
    try {
      await login(identity.trim(), password);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        'Gagal masuk ke sistem. Silakan periksa kredensial Username/Email dan kata sandi Anda.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (user: string, pass: string) => {
    setIdentity(user);
    setPassword(pass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-900 via-primary-900 to-slate-950">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.18),rgba(255,255,255,0))] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-brand-blue-600/20 border border-brand-blue-500/30 text-brand-blue-500 mb-1 shadow-lg shadow-brand-blue-600/20">
            <ShieldCheck className="h-8 w-8 text-brand-blue-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            Open<span className="text-brand-blue-400 font-extrabold">RMI</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Platform Penilaian Tingkat Kematangan Risiko BUMN (Permen PER-2/MBU/03/2023)
          </p>
        </div>

        {/* Card Form */}
        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-md text-white shadow-2xl">
          <CardHeader className="space-y-1 pb-4 border-slate-800">
            <CardTitle className="text-lg text-white font-semibold">
              Masuk ke Workspace
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Gunakan akun terdaftar (Username atau Email) Anda
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {errorMessage && (
              <div className="flex items-start space-x-2.5 p-3 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Identity Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Username atau Email Terdaftar <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    placeholder="admin@openrmi.id atau username"
                    disabled={isLoading}
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-300">
                    Kata Sandi <span className="text-rose-400">*</span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 pr-10 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="w-full bg-brand-blue-600 hover:bg-brand-blue-500 text-white font-semibold h-10 shadow-lg shadow-brand-blue-600/20 mt-2"
              >
                Masuk ke Sistem
              </Button>
            </form>

            {/* Quick Demo Credentials Assistant */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
                Akses Cepat Pengujian Persona (Demo)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@openrmi.id', 'AdminSecret@123')}
                  className="flex items-center space-x-1.5 p-2 rounded border border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 text-slate-300 text-xs transition-colors text-left"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-blue-400 shrink-0" />
                  <span className="truncate">Administrator</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@sucofindo.co.id', 'VendorSecret@123')}
                  className="flex items-center space-x-1.5 p-2 rounded border border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 text-slate-300 text-xs transition-colors text-left"
                >
                  <Building2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Lembaga Vendor</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <p className="text-center text-[11px] text-slate-500">
          OpenRMI Platform Multi-Tenant &copy; {new Date().getFullYear()} — Dilengkapi Row-Level Security (RLS) & Audit Trail
        </p>
      </div>
    </div>
  );
}
