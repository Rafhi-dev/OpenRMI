# TODO.md — Checklist Tahapan Pengembangan Platform OpenRMI
# Multi-Tenant Enterprise Risk Maturity Assessment Platform

Dokumen ini adalah panduan kerja teknis dan pelacak kemajuan pengerjaan fitur (*step-by-step technical implementation checklist*) platform OpenRMI.

---

## 📌 Status Ringkasan Proyek

- **Total Fase**: 10 Fase
- **Status Berjalan**: Fase 1 (Selesai 100%) $\rightarrow$ Siap Masuk Fase 2 (Auth, Multi-Tenancy RLS & Guard)
- **Terakhir Diperbarui**: 25 September 2026

---

## 🏗️ FASE 0: Inisialisasi Lingkungan & Fondasi Repositori
- [x] Pembuatan dokumen acuan produk: `PRD.md` (Spesifikasi Kebutuhan & Regulasi KBUMN)
- [x] Pembuatan arsitektur sistem & database: `ARCHITECTURE.md` (PostgreSQL RLS, Prisma, RESTful API)
- [x] Pembuatan panduan desain & tokens: `DESIGN_SYSTEM.md` (Tailwind Tokens, UI Components, Mockups)
- [x] Pembuatan panduan agen & developer: `AGENTS.md` (Invarian Aturan Bisnis, Subagents)
- [x] Konfigurasi file prasyarat & kredensial: `pre-req.md` (PostgreSQL, Cloudflare R2, DeepSeek, Jina, Upstash Redis)
- [x] Perlindungan file sensitif via `.gitignore`
- [x] Inisialisasi repositori Git & *first commit* (`main` branch)
- [x] Inisialisasi struktur direktori independen: folder `backend/`

---

## 🗄️ FASE 1: Basis Data, Skema Prisma & Core Scoring Engine
- [x] Inisialisasi project Node.js Express TypeScript di `backend/`
- [x] Konfigurasi file environment `backend/.env` & template `backend/.env.example`
- [x] Setup skema Prisma (`backend/prisma/schema.prisma`) lengkap 4-Role, RLS, Vektor, Dokumen Tambahan & Survei
- [x] Menjalankan sinkronisasi database ke PostgreSQL (`npx prisma db push` berhasil ke host live port 10013)
- [x] Membuat script seeding master data regulasi KBUMN (`backend/prisma/seed.ts`):
  - [x] 5 Dimensi & Sub-Dimensi KBUMN
  - [x] Master Konfigurasi AI Global (DeepSeek LLM + Jina Embeddings)
  - [x] Standar Kriteria Penilaian KBUMN Level 1 s.d. 5
  - [x] Akun Root Administrator Platform (`admin@openrmi.id`)
- [x] Membangun modul *Pure Math Scoring Engine* di `backend/src/modules/scoring/`:
  - [x] Formula Kaidah Kriteria Terlemah (*Weakest-Link Rule*): $\min(K_1, \dots, K_m)$ integer 1-5
  - [x] Rata-rata Skor 5 Dimensi
  - [x] Klausul Ambang Batas Aspek Kinerja (*Gating Clause* $\ge 3.00$)
  - [x] Matriks Penalti Kinerja (Rating 50% + Komposit Risiko 50% $\rightarrow -1.00$ s.d. $0.00$)
  - [x] Komputasi Skor Akhir RMI & Penentuan Fase Kematangan (Awal s.d. Praktik Terbaik)
- [x] Menulis Unit Tests Scoring Engine di `backend/test/scoring/scoring.engine.test.ts` (14/14 tests lulus, 100% coverage)
- [x] Setup Express Server Entry Point `backend/src/server.ts` & Integration Test `backend/test/api/server.test.ts` (Lulus)

---

## 🔐 FASE 2: Autentikasi, Multi-Tenancy RLS & Guard Keamanan
- [ ] Modul Autentikasi JWT (`backend/src/modules/auth/`):
  - [ ] Login email & password hash (Argon2 / Bcrypt)
  - [ ] Refresh token rotation
  - [ ] Endpoint `/api/v1/auth/me` & profil pengguna
- [ ] Layanan Impersonasi Vendor (`backend/src/modules/auth/impersonation.service.ts`):
  - [ ] Verifikasi hak akses eksklusif `ADMINISTRATOR`
  - [ ] Penerbitan short-lived impersonation token (max 2 jam) dengan klaim `impersonated_by`
- [ ] Middleware Express.js Keamanan:
  - [ ] `tenantContext.middleware.ts`: Menyuntikkan `current_vendor_id`, `current_tenant_id`, `current_user_id`, dan `impersonated_by_admin_id` ke sesi PostgreSQL RLS
  - [ ] `rbacGuard.middleware.ts`: Validasi otorisasi 4 Peran (`ADMINISTRATOR`, `VENDOR`, `EXTERNAL_CONSULTANT`, `COUNTERPART_TEAM`)
  - [ ] `rateLimiter.middleware.ts`: Token bucket via Upstash Redis
  - [ ] `auditLogger.ts`: Dispatcher log audit transaksi otomatis (*immutable audit trail*)

---

## 🛡️ FASE 3: Modul Administrator Platform & Vendor Portal
- [ ] Backend API Administrator (`/api/v1/admin/*`):
  - [ ] CRUD Akun Lembaga Vendor (`/vendors`) & alokasi kuota tenant
  - [ ] Endpoint Impersonasi Vendor (`/vendors/:id/impersonate` & `/exit-impersonate`)
  - [ ] Master Model Regulasi KBUMN (`/master-models`)
  - [ ] Konfigurasi Terpusat AI (`/ai-config`: DeepSeek Flash/Pro, Thinking Mode, Jina v4)
  - [ ] Endpoint Health Check Sistem (`/system/health`: DB, Redis, BullMQ, S3 latency)
  - [ ] Global Audit Trail Viewer (`/audit-logs`)
- [ ] Backend API Vendor (`/api/v1/vendor/*`):
  - [ ] Manajemen Perusahaan Klien (`/tenants`: BUMN/Swasta di bawah portofolio vendor)
  - [ ] Manajemen Konsultan Asesor (`/consultants`: tim penilai di bawah lembaga vendor)
  - [ ] Engine Penugasan Proyek (`/assignments`: Konsultan $\rightarrow$ Tenant & Periode)
  - [ ] Dashboard Portfolio Progress (`/portfolio-progress`)
- [ ] Frontend Administrator Console:
  - [ ] Panel Navigasi Admin & System Health Check Cards
  - [ ] Form Pengaturan Global AI (Model Selector Flash/Pro, Thinking Mode switch, Temperature, Jina v4)
  - [ ] Tabel Manajemen Akun Vendor dengan tombol aksi `[ 🎭 Impersonate ]`
  - [ ] Sticky Floating Banner Mode Impersonasi di bagian atas layar
- [ ] Frontend Vendor Portal:
  - [ ] Tampilan Portofolio Tenant Klien & Penugasan Konsultan Asesor

---

## 📁 FASE 4: Modul Tim Counterpart (Eviden & Dokumen Tambahan)
- [ ] Integrasi Cloudflare R2 / S3 Service:
  - [ ] Presigned URL generator untuk upload langsung berkas dokumen (PDF, DOCX, XLSX)
  - [ ] Presigned URL generator untuk preview & unduh berdurasi terbatas (15 menit)
- [ ] Backend API Counterpart (`/api/v1/counterpart/*`):
  - [ ] Checklist eviden wajib per kriteria parameter (`/evidence-checklist`)
  - [ ] Upload & hapus dokumen eviden per parameter (`/evidences/*`)
  - [ ] Upload & manajemen dokumen tambahan pasca-FGD (`/supplementary-documents`)
  - [ ] Live monitoring progres reviu asesor (`/monitoring-progress`)
  - [ ] Konfirmasi draf hasil penilaian pimpinan BUMN (`/confirm-draft`)
- [ ] Frontend Portal Tim Counterpart:
  - [ ] Workspace unggah eviden per parameter dengan drag-and-drop
  - [ ] Tab Khusus Dokumen Tambahan & Klarifikasi Pasca-FGD beserta status proses RAG
  - [ ] Dashboard Live Monitoring Progres Pekerjaan Asesor (Persentase reviu, catatan klarifikasi)

---

## 🤖 FASE 5: Background RAG Ingestion Pipeline & AI Assistance
- [ ] Setup BullMQ Worker & Redis Queue di Backend
- [ ] Pipeline Ingestion Dokumen Asinkron:
  - [ ] MinerU Worker: Ekstraksi PDF layout, tabel utuh, dan preservasi nomor halaman asli
  - [ ] Jina AI Worker: Embedding semantik per halaman via model `jina-embeddings-v4`
  - [ ] PostgreSQL `pgvector`: Penyimpanan vektor chunk terisolasi per tenant dan periode
- [ ] Layanan AI Reasoning (DeepSeek LLM):
  - [ ] Service client DeepSeek dengan mode inferensi `deepseek-flash` atau `deepseek-v4-pro`
  - [ ] Implementasi penalaran berantai (*Thinking Mode / Chain-of-Thought*) untuk kepatuhan audit
  - [ ] Prompt template pencocokan bukti terhadap standar kriteria Juknis KBUMN
- [ ] Endpoint Asistensi AI Konsultan:
  - [ ] `POST /api/v1/consultant/ai-assist/:parameterId`: Menghasilkan rekomendasi nilai, nomor halaman, dan kutipan eviden verbatim
  - [ ] `POST /api/v1/consultant/ai-assist/apply`: One-Click Apply ke lembar kerja konsultan
  - [ ] `POST /api/v1/consultant/supplementary-documents/:id/ai-analyze`: Analisis cerdas dokumen tambahan berbasis *custom prompt* bebas
  - [ ] `PUT /api/v1/consultant/supplementary-documents/:id/analysis-result`: Simpan/edit catatan privat asesor (*Strict Assessor Confidentiality* — tersembunyi dari Counterpart)

---

## 📝 FASE 6: Workspace Penilaian Konsultan Eksternal (Asesor)
- [ ] Frontend Split-Screen Reviewer (60% Form Evaluasi + 40% PDF/Image Viewer)
- [ ] Aksi Cepat `AI Help` per parameter dan Drawer Rekomendasi Cerdas
- [ ] Modal Analisis Kustom AI Dokumen Tambahan & Kartu Catatan Privat Asesor
- [ ] Komponen Screenshot Embedder (Pengganti Kolom L `SCORE RMI.xlsx`)
- [ ] Form Input Evaluasi Kriteria, Catatan Reviu Dokumen (Kolom J) & Celah Temuan
- [ ] Lembar Kalkulasi Aspek Kinerja (Tingkat Kesehatan Rating + Komposit Risiko)
- [ ] Modul Rekomendasi Perbaikan KBUMN & Matriks Prioritas 2x2 (Impact vs Ease)

---

## 📊 FASE 7: Data Historis, Komparasi YoY & Survei Budaya Risiko Publik
- [ ] Form Input Skor RMI Tahun Sebelumnya (Baseline Historis - Opsional):
  - [ ] Dapat diisi & disunting setara oleh Konsultan Eksternal maupun Tim Counterpart
  - [ ] Input Skor 5 Dimensi, Aspek Dimensi, Kinerja, RMI Total & Fase Kematangan
  - [ ] Accordion rincian skor 42 parameter tahun lalu (opsional)
- [ ] Fitur Perbandingan Capaian YoY (Tahun Berjalan vs Tahun Lalu):
  - [ ] Komputasi delta perubahan ($\Delta = S_{\text{Current}} - S_{\text{Previous}}$)
  - [ ] Komponen **Diagram Batang Komparatif YoY (*Grouped Bar Chart*)**
  - [ ] Kontrol hak akses: Analitik penuh untuk Konsultan, **Read-Only** untuk Vendor & Counterpart
- [ ] Modul Survei Budaya Risiko Publik (Akses Tanpa Login):
  - [ ] Generator link unik bertoken publik & QR Code
  - [ ] Halaman survei publik mobile-friendly (Kuesioner skala Likert 1-5, demografi anonim)
  - [ ] Fingerprinting anti-spam & batas periode aktif survei
  - [ ] Agregasi otomatis skor persepsi budaya risiko
- [ ] Fitur Kesenjangan Persepsi (*Perception Gap Analysis*):
  - [ ] Komparasi Skor Objektif Asesor vs Skor Persepsi Survei Karyawan
  - [ ] Komponen **Diagram Batang Kesenjangan Persepsi (*Side-by-Side Bar Chart*)**
  - [ ] Label kesenjangan: *Overconfident*, *Selaras*, *Perlu Edukasi*
  - [ ] Kontrol hak akses: Analitik penuh untuk Konsultan, **Read-Only** untuk Vendor & Counterpart

---

## 📄 FASE 8: Pelaporan Resmi, Ekspor Excel & Pemantauan Tindak Lanjut
- [ ] Generator Laporan PDF Ringkasan Hasil Resmi Format 1.2.8 (Puppeteer)
- [ ] Generator File Excel via **ExcelJS**:
  - [ ] Menghasilkan workbook yang 100% identik struktur, sel, formula, dan layout lembar kerja `SCORE RMI.xlsx`
- [ ] Modul Pemantauan Tindak Lanjut Triwulanan Pasca-Asesmen:
  - [ ] Portal pelaporan progres rekomendasi triwulanan (*S, BS, BD, TDD*) oleh Counterpart
  - [ ] Unggah bukti implementasi tindak lanjut & verifikasi oleh konsultan

---

## 🚀 FASE 9: Pengujian, Hardening & Deployment Produksi
- [ ] Pengujian Integrasi API (Super Admin, Vendor, Consultant, Counterpart, Public Survey)
- [ ] Pengujian Isolasi Data Multi-Tenant & Penetrasi RLS (Memastikan nol kebocoran data antar-tenant/vendor)
- [ ] Verifikasi Kerahasiaan Catatan Asesor (*Assessor Confidentiality Leak Prevention*)
- [ ] Build & Type-checking: `npm run lint` && `npm run typecheck` di kedua direktori
- [ ] Deployment Backend ke Railway (Express.js, PostgreSQL 18 RLS, Redis)
- [ ] Deployment Frontend ke Vercel (Next.js 14 App Router)
- [ ] UAT (User Acceptance Testing) bersama pengguna
