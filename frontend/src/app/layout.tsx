import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ImpersonationBanner } from '@/components/auth/ImpersonationBanner';

export const metadata: Metadata = {
  title: 'OpenRMI — Enterprise Risk Maturity Assessment Platform',
  description:
    'SaaS Multi-Tenant Penilaian Tingkat Kematangan Risiko BUMN Berdasarkan Peraturan PER-2/MBU/03/2023',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col bg-surface-bg text-primary-900 antialiased selection:bg-brand-blue-100 selection:text-brand-blue-700">
        <AuthProvider>
          <ImpersonationBanner />
          <main className="flex-1 flex flex-col">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
