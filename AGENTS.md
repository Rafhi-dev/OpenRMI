# AGENTS.md — Development Guidelines & Instructions for AI Agents & Developers
# OpenRMI — Multi-Tenant Enterprise Risk Maturity Assessment Platform

---

## 1. Ikhtisar Repositori & Konteks Proyek

**OpenRMI** adalah platform B2B SaaS Multi-Tenant tingkat korporasi untuk penilaian dan pemantauan tingkat kematangan risiko (*Risk Maturity Index / RMI*) BUMN berdasarkan regulasi **Kementerian BUMN (Permen PER-2/MBU/03/2023 dan Juknis 8 Per-2 BUMN 2023)**.

### Dokumen Referensi Wajib Dibaca:
- **[PRD.md](file:///c:/Users/user/Documents/AppDev/OpenRMI/PRD.md)**: Kebutuhan produk, regulasi, logika bisnis, dan persona pengguna.
- **[DESIGN_SYSTEM.md](file:///c:/Users/user/Documents/AppDev/OpenRMI/DESIGN_SYSTEM.md)**: Design tokens, tema Tailwind, komponen UI khusus, dan panduan UX.
- **[ARCHITECTURE.md](file:///c:/Users/user/Documents/AppDev/OpenRMI/ARCHITECTURE.md)**: Arsitektur multi-tenant RLS, skema Prisma, dan spesifikasi API Express.js.
- **`SCORE RMI.xlsx`**: File acuan baku struktur lembar kerja, formula, dan kriteria penilaian.

---

## 2. Tumpukan Teknologi Resmi (Approved Tech Stack)

| Lapisan | Teknologi | Catatan Implementasi |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14+ (App Router, React 19, TypeScript)** | Berada di direktori terpisah `frontend/`. Desktop-first, SSR untuk dashboard, CSR untuk split-screen reviewer. |
| **Styling & UI** | **Tailwind CSS + Shadcn UI (Radix)** | Mengikuti design tokens pada `DESIGN_SYSTEM.md` (`brand-blue`, `navy`, `rmi-*`, `status-*`). |
| **Backend API** | **Express.js (Node.js + TypeScript)** | Berada di direktori terpisah `backend/`. Arsitektur RESTful modular: Routers $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Prisma Client. |
| **Database & ORM** | **PostgreSQL 18 + Prisma ORM** | **Wajib RLS (Row-Level Security)** pada setiap tabel tenant. Skema & migrasi berada di `backend/prisma/`. |
| **Object Storage** | **S3-Compatible (MinIO / Cloudflare R2 / AWS S3)** | Penyimpanan dokumen bukti terenkripsi AES-256 via Presigned URLs. |
| **Cache & Queue** | **Redis (Cache & In-Memory Store) + BullMQ** | Caching respons data, manajemen sesi JWT, rate limiter, antrean pemrosesan PDF & Excel. |
| **Manajemen Paket** | **npm / pnpm** | Dijalankan secara terpisah dan independen di masing-masing direktori (`frontend/` dan `backend/`). |

---

## 3. Struktur Direktori Proyek (Frontend & Backend Terpisah)

Struktur proyek memisahkan **Frontend** dan **Backend** secara independen agar mempermudah deployment, pengelolaan dependensi, dan siklus CI/CD terpisah:

```
OpenRMI/
├── frontend/                        # Aplikasi Frontend Next.js 14+ (Stand-alone)
│   ├── src/
│   │   ├── app/                     # App Router (Pages, Layouts)
│   │   │   ├── (auth)/              # Login, Register, Forgot Password
│   │   │   │   └── page.tsx
│   │   │   ├── (dashboard)/         # Role-based Dashboard Views
│   │   │   │   ├── admin/           # Super Admin Console (Tenants, Assignments)
│   │   │   │   ├── consultant/      # Workspace Penilaian 42 Parameter & Reviewer
│   │   │   │   └── counterpart/     # Portal Unggah Bukti & Live Monitoring
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/              # Reusable UI Components
│   │   │   ├── rmi/                 # ParameterMatrix, EvidenceViewer, RadarChart, etc.
│   │   │   └── ui/                  # Button, Input, Modal, Table, Badge, Drawer (Shadcn)
│   │   ├── hooks/                   # Custom React Hooks (useTenant, useScoring, useEvidence)
│   │   ├── lib/                     # API Client (Axios/Ky instance), utils, formatters
│   │   ├── types/                   # Frontend TypeScript interfaces & DTOs
│   │   └── styles/                  # Tailwind CSS globals & fonts (Plus Jakarta Sans)
│   ├── public/                      # Static Assets (Logos, Icons)
│   ├── tailwind.config.js           # Konfigurasi Tailwind dari DESIGN_SYSTEM.md
│   ├── tsconfig.json                # TypeScript Config Frontend
│   └── package.json                 # Dependensi Frontend
│
├── backend/                         # Aplikasi Backend Express.js (Stand-alone)
│   ├── prisma/                      # Skema Database & Migrasi PostgreSQL RLS
│   │   ├── schema.prisma            # Skema resmi dari ARCHITECTURE.md
│   │   ├── migrations/              # SQL Migrations (Termasuk DDL RLS Policies)
│   │   └── seed.ts                  # Seeding Master 42 Parameter, Dimensi & Admin
│   ├── src/
│   │   ├── config/                  # Environment variables, Redis, S3/MinIO, Prisma Client
│   │   ├── middlewares/             # Auth JWT, Tenant RLS Context, RBAC Guard, Error Handler
│   │   ├── modules/                 # Arsitektur Berbasis Fitur (Feature Modules)
│   │   │   ├── auth/                # Controller, Service, DTO, JWT Token Strategy
│   │   │   ├── tenants/             # Super Admin Tenant Management
│   │   │   ├── assignments/         # Consultant Assignment & e-NDA Verification
│   │   │   ├── evidences/           # Upload Bukti Dukung, Metadata, Presigned URL
│   │   │   ├── scoring/             # Pure Logic RMI Calculation (Weakest-Link, Gating, Perf)
│   │   │   ├── evaluations/         # Input Skor Kriteria, Screenshot Embedder, Gap Analysis
│   │   │   ├── recommendations/     # 2x2 Priority Matrix & Action Plan
│   │   │   ├── monitoring/          # Counterpart Real-time Progress Tracking
│   │   │   └── reports/             # PDF Generator (Puppeteer) & Excel Sync (ExcelJS)
│   │   ├── routes/                  # Express API Route Registrations (/api/v1/*)
│   │   ├── utils/                   # Logger (Pino/Winston), Audit Trail Dispatcher
│   │   └── server.ts                # Express Server Entry Point (Port 5000/api)
│   ├── test/                        # Pengujian Unit & Integrasi
│   │   ├── scoring/                 # Scoring Engine Unit Tests (100% Coverage Wajib)
│   │   └── api/                     # Super Admin, Counterpart & Consultant API Tests
│   ├── tsconfig.json                # TypeScript Config Backend
│   └── package.json                 # Dependensi Backend
│
├── .gitignore                       # Git ignore untuk root, frontend/node_modules, backend/node_modules
├── PRD.md                           # Dokumen Kebutuhan Produk & Aturan Bisnis
├── DESIGN_SYSTEM.md                 # Desain Token, Panduan UI & Komponen Khusus RMI
├── ARCHITECTURE.md                  # Arsitektur Sistem, Skema Database & API Express.js
└── AGENTS.md                        # Panduan Khusus Pengembang & Agen AI
```

---

## 4. Aturan Bisnis Baku & Invarian Sistem (Strict Invariants)

Setiap agen AI atau pengembang yang memodifikasi kode **WAJIB mematuhi invarian bisnis berikut tanpa kompromi**:

### 4.1 Invarian Multi-Tenancy & RBAC
1. **Pemisahan Tenant & Vendor Mutlak**:
   - Seluruh query data bisnis (dokumen bukti, evaluasi, skor, rekomendasi) **wajib menyertakan filter `tenant_id`**.
   - Portofolio perusahaan klien dan akun konsultan **wajib terisolasi berbasis `vendor_id`**.
   - Di lapisan Express.js, middleware `tenantContext` wajib menyuntikkan session variable ke transaksi PostgreSQL:
     ```sql
     SET LOCAL app.current_vendor_id = '<vendor_id>';
     SET LOCAL app.current_tenant_id = '<tenant_id>';
     SET LOCAL app.current_user_id = '<user_id>';
     SET LOCAL app.impersonated_by_admin_id = '<admin_id_or_null>';
     ```
2. **Validasi Empat Peran (*4-Role RBAC*)**:
   - `ADMINISTRATOR`: Platform root. Mengelola master model regulasi, konfigurasi global AI, monitoring kesehatan sistem, lisensi langganan, CRUD akun vendor, dan impersonasi vendor. **Tidak melakukan input skor penilaian**.
   - `VENDOR`: Lembaga jasa asesmen. Mengelola tenant klien di bawah portofolionya, akun konsultan/asesor di lembaganya, dan penugasan asesmen.
   - `EXTERNAL_CONSULTANT`: Hanya dapat mengakses tenant yang terdaftar pada tabel `consultant_assignments` dengan status aktif (`is_active = true`). Memiliki hak input skor, review, screenshot, AI help, custom prompt AI, dan rekomendasi.
   - `COUNTERPART_TEAM`: Hanya dapat mengakses tenant perusahaannya sendiri. Memiliki hak unggah berkas bukti, dokumen tambahan pasca-FGD, monitoring progress asesor, dan tindak lanjut rekomendasi. **Tidak dapat mengubah skor**.
3. **Integritas Sesi Impersonasi Vendor (*Impersonation Invariant*)**:
   - Fitur impersonasi hanya dapat dipicu oleh role `ADMINISTRATOR`.
   - Token impersonasi berdurasi terbatas (maksimal 2 jam) dan seluruh mutasi data yang terjadi selama sesi impersonasi wajib membubuhkan jejak `impersonatedByAdminId` pada record `audit_logs`.
   - Frontend wajib menampilkan banner sticky permanen di bagian atas layar saat mode impersonasi aktif.

### 4.2 Invarian Mesin Kalkulasi (*Scoring Engine*)
1. **Aturan Kriteria Terlemah (*Weakest-Link Rule*)**:
   $$\text{Skor Parameter } P_i = \min(K_{i,1}, K_{i,2}, \dots, K_{i,m})$$
   Skor parameter **HARUS berupa bilangan bulat (integer 1, 2, 3, 4, atau 5)**. Tidak boleh berupa pecahan.
2. **Rata-rata Skor Dimensi**:
   Skor dimensi diperoleh dari rata-rata (*average*) skor parameter di dalam dimensi tersebut, dibulatkan ke **1 angka desimal**.
3. **Klausul Ambang Batas Aspek Kinerja (*Gating Clause*)**:
   - Jika Skor Aspek Dimensi $< 3.00$, maka **Aspek Kinerja TIDAK DIHITUNG** (Penyesuaian Skor $= 0.00$, Skor Akhir RMI $=$ Skor Aspek Dimensi).
   - Jika Skor Aspek Dimensi $\ge 3.00$, maka Aspek Kinerja dihitung dari kombinasi *Final Rating* (50%) dan *Peringkat Komposit Risiko* (50%), lalu dicocokkan ke tabel penalti ($-1.00$ s.d. $0.00$).
4. **Invarian Baseline Skor Historis & Komparasi YoY**:
   - Pengisian skor tahun sebelumnya bersifat opsional. Konsultan dan Counterpart memiliki hak input/edit setara pada tabel `historical_assessments`.
   - Perhitungan delta: $\Delta = S_{\text{Saat Ini}} - S_{\text{Tahun Lalu}}$.
   - Tampilan visual diagram batang YoY di dashboard Vendor dan Counterpart bersifat **Read-Only mutlak**.
5. **Invarian Gap Persepsi Survei Budaya Risiko**:
   - Responden survei mengisi instrumen kuesioner secara anonim tanpa login akun.
   - Perhitungan selisih persepsi: $\Delta_{\text{Persepsi}} = S_{\text{Survei}} - S_{\text{Asesor}}$ pada Parameter 1 dan Dimensi 1.
   - Tampilan visual diagram batang kesenjangan persepsi di dashboard Vendor dan Counterpart bersifat **Read-Only mutlak**.

### 4.3 Invarian AI Assistance & Pipeline RAG
1. **Prinsip Human-in-the-Loop**:
   - Rekomendasi skor dari DeepSeek LLM bersifat *advisory / asistif*. Nilai skor kriteria resmi di database hanya tersimpan setelah disetujui / diterapkan secara eksplisit oleh Konsultan Eksternal (*One-Click Apply*).
2. **Isolasi Vektor Tenant Mutlak**:
   - Query pencarian kemiripan vektor (`Jina Embeddings` $\leftrightarrow$ `PostgreSQL 18 pgvector`) **wajib menyertakan filter `tenant_id` dan `period_id`**. Dokumen bukti satu perusahaan tidak boleh muncul pada pencarian tenant lain.
3. **Ingestion Dokumen Asinkron**:
   - Ekstraksi PDF via **MinerU** dan pembuatan vektor via **Jina** wajib berjalan di latar belakang melalui **BullMQ worker** saat Counterpart mengunggah dokumen, sehingga tidak membebani performa request HTTP.
4. **Kerahasiaan Catatan Asesor Mutlak (*Strict Assessor Confidentiality*)**:
   - Hasil analisis AI dokumen tambahan (`DocumentAnalysisResult`) beserta catatan internal asesor (`assessorNotes`) **TIDAK BOLEH** pernah dibocorkan atau diekspos ke Tim Counterpart. Endpoint Counterpart tidak boleh menyertakan relasi/field ini dalam respons JSON apa pun.
5. **Resolusi Konfigurasi AI Terpusat (*Centralized AI Configuration*)**:
   - Kredensial API Key (DeepSeek & Jina) dan parameter model inferensi tidak boleh di-hardcode ataupun dibaca dari `.env` perorangan. Seluruh service inferensi wajib membaca konfigurasi global dinamis dari tabel `ai_configurations` yang dikelola eksklusif oleh `ADMINISTRATOR`.

---

## 5. Standar Format Respons API Express.js

Seluruh endpoint API Express.js pada `backend/src/routes/` harus mengembalikan format respons JSON standar:

```typescript
// Sukses
interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Gagal
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;       // Contoh: 'UNAUTHORIZED', 'TENANT_NOT_FOUND', 'WEAKEST_LINK_VIOLATION'
    message: string;    // Pesan ramah pengguna
    details?: unknown;  // Detail validasi Zod atau stack trace (hanya non-production)
  };
}
```

---

## 6. Pembagian Peran Agen AI (Specialized Subagents)

Saat melakukan *pair programming* atau *multi-agent delegation*, delegasikan pekerjaan sesuai pemisahan direktori:

### 1. `Frontend-Agent` (Spesialis UI/UX Next.js — Lingkup `frontend/`)
- **Tugas**:
  - Membangun antarmuka Next.js App Router di `frontend/src/` sesuai [DESIGN_SYSTEM.md](file:///c:/Users/user/Documents/AppDev/OpenRMI/DESIGN_SYSTEM.md).
  - Mengimplementasikan workspace reviu split-screen (60% form reviu + 40% PDF/Image viewer).
  - Membangun antarmuka **Administrator Platform Console**: Form Master Model Industri, Form Konfigurasi Global AI (DeepSeek/Jina), Panel Health Check, Manajemen Lisensi, CRUD Akun Vendor, dan Floating Banner Mode Impersonate.
  - Membangun antarmuka **Vendor Portal**: Manajemen portofolio tenant klien, pendaftaran tim konsultan eksternal, dan penugasan proyek (*assignment*).
  - Membangun antarmuka **Survei Budaya Risiko Publik**: Halaman survei mobile-friendly tanpa login berbasis token unik dan QR Code.
  - Membangun komponen **Form Input Baseline Skor Historis** (dapat diisi Konsultan & Counterpart).
  - Membangun komponen **Diagram Batang Komparatif YoY (Grouped Bar Chart)** dan **Diagram Batang Kesenjangan Persepsi Survei (Side-by-Side Bar Chart)** dengan mode interaktif untuk Asesor dan **Read-Only** untuk Vendor & Counterpart.
  - Membangun portal **Tim Counterpart**: Tab Unggah Dokumen Tambahan Pasca-FGD beserta pelacak status ingestion RAG.
  - Membangun workspace **Konsultan Eksternal**: Tombol `AI Help`, Drawer Rekomendasi Cerdas, Modal AI Analisis Kustom Dokumen Tambahan (*custom prompt*), serta Kartu Catatan Privat Asesor.
  - Memastikan aksesibilitas (WCAG 2.1 AA) dan navigasi keyboard untuk input skor cepat.
- **Pantangan**: Tidak boleh mengubah formula kalkulasi matematika di frontend secara independen; selalu panggil endpoint kalkulasi backend atau sync dengan aturan resmi.

### 2. `Backend-Agent` (Spesialis Express.js & API — Lingkup `backend/`)
- **Tugas**:
  - Membangun controller, routes, dan services Express.js di `backend/src/` sesuai [ARCHITECTURE.md](file:///c:/Users/user/Documents/AppDev/OpenRMI/ARCHITECTURE.md).
  - Mengimplementasikan endpoint Administrator (`/api/v1/admin/*`): CRUD Vendor, Impersonate session generator, master models, system health check, global audit logs, dan AI config.
  - Mengimplementasikan endpoint Vendor (`/api/v1/vendor/*`): Manajemen tenant klien, tim konsultan, dan penugasan asesmen.
  - Mengimplementasikan endpoint **Survei Publik Tanpa Login** (`/api/v1/surveys/*`): Validasi token publik, instrumen kuesioner, fingerprinting anti-spam, dan agregasi skor otomatis.
  - Mengimplementasikan endpoint **Skor Historis & Analisis Komparatif**: Input/edit baseline tahun sebelumnya (Konsultan & Counterpart), kalkulasi delta YoY, agregasi perbandingan Asesor vs Survei, dan proteksi read-only bagi peran Vendor/Counterpart.
  - Mengimplementasikan **Pipeline RAG Ingestion**: Worker BullMQ untuk parser **MinerU**, client **Jina Embeddings v2/v3**, dan penyimpanan vektor di **PostgreSQL 18 `pgvector`** (untuk dokumen eviden maupun dokumen tambahan).
  - Mengimplementasikan **Layanan AI Assistance**: Service penalaran **DeepSeek LLM** untuk rekomendasi skor kriteria dan analisis cerdas dokumen tambahan berbasis custom prompt dengan jaminan privasi asesor.
  - Menerapkan middleware autentikasi JWT, Tenant & Vendor RLS Context, Impersonation verification, dan validasi schema menggunakan **Zod**.
  - Membangun engine ekspor Excel via **ExcelJS** yang mereplikasi lembar kerja `SCORE RMI.xlsx`.
- **Pantangan**: Tidak boleh melakukan query raw SQL tanpa parameter binding atau mengabaikan context tenant/vendor ID, dan dilarang membocorkan `DocumentAnalysisResult` ke peran Counterpart.

### 3. `Domain-Scoring-Agent` (Spesialis Matematika RMI & Regulasi — Lingkup `backend/src/modules/scoring/`)
- **Tugas**:
  - Mengembangkan dan memelihara modul scoring di `backend/src/modules/scoring/`.
  - Menulis pengujian unit menyeluruh di `backend/test/scoring/` yang mencakup seluruh skenario sudut (*edge cases*):
    - Seluruh kriteria 5, satu kriteria 1 $\rightarrow$ Skor parameter wajib 1.
    - Aspek Dimensi 2.99 $\rightarrow$ Penalti kinerja wajib 0.00.
    - Aspek Dimensi 3.00, Kinerja $\le 50$ $\rightarrow$ Penalti kinerja wajib -1.00.
- **Pantangan**: Tidak boleh mengubah nilai konstanta bobot atau tabel konversi di luar dokumen resmi KBUMN.

### 4. `Database-Agent` (Spesialis PostgreSQL & Prisma — Lingkup `backend/prisma/`)
- **Tugas**:
  - Mengelola skema `backend/prisma/schema.prisma` dan migrasi database.
  - Menulis script DDL untuk PostgreSQL Row-Level Security (RLS) policies di folder migrasi.
  - Menambahkan indexing komposit pada `(tenant_id, period_id)` untuk kecepatan respons query $\le 1.5$ detik.

---

## 7. Alur Kerja Git & Panduan Perintah Pengembangan

### Perintah Menjalankan Proyek:
```bash
# Menjalankan Backend (Express.js)
cd backend
npm install
npm run dev      # Berjalan di http://localhost:5000

# Menjalankan Frontend (Next.js)
cd frontend
npm install
npm run dev      # Berjalan di http://localhost:3000
```

### Konvensi Pesan Commit (Conventional Commits):
- `feat(frontend): implement weakest-link parameter matrix view`
- `feat(backend): add tenant context RLS middleware in express`
- `feat(scoring): implement weakest-link calculation engine`
- `feat(counterpart): add real-time monitoring dashboard`
- `test(scoring): add unit tests for performance gating`

### Target Deployment Lingkungan Produksi:
- **Frontend**: Dideploy ke **Vercel** dari root directory `frontend/` (otomatis terintegrasi via GitHub).
- **Backend & Database**: Dideploy ke **Railway** dari root directory `backend/` (Express.js, Managed PostgreSQL 18 RLS, dan Managed Redis).

### Prasyarat Pull Request / Code Review:
- Seluruh unit tests di `backend/test/scoring/` wajib lulus 100%.
- Linting & type checking (`npm run lint` && `npm run typecheck`) bersih di kedua folder `frontend/` dan `backend/`.
- Tidak ada hardcoded credentials atau JWT secret.

---
*Dokumen AGENTS.md ini wajib dijadikan acuan utama bagi seluruh agen AI dan pengembang dalam mengimplementasikan kode pada proyek OpenRMI.*
