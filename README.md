# OpenRMI — Multi-Tenant Enterprise Risk Maturity Assessment Platform

**OpenRMI** adalah platform B2B SaaS Multi-Tenant tingkat korporasi untuk penilaian dan pemantauan tingkat kematangan risiko (*Risk Maturity Index / RMI*) BUMN berdasarkan regulasi **Kementerian BUMN (Permen PER-2/MBU/03/2023 dan Juknis 8 Per-2 BUMN 2023)**.

---

## 🚀 Fitur Utama

- **Pondasi Regulasi Baku KBUMN**: Mendukung Model Industri Umum (42 Parameter), Perbankan (42 Parameter), dan Asuransi (41 Parameter).
- **Mesin Kalkulasi Otomatis (*Scoring Engine*)**:
  - Kaidah Kriteria Terlemah (*Weakest-Link Rule*): $\text{Skor Parameter} = \min(K_1, K_2, \dots, K_m)$.
  - Rata-rata Skor 5 Dimensi dan Klausul Ambang Batas Kinerja (*Gating Clause* $\ge 3.00$).
- **Pipeline RAG & AI Assistance Cerdas**:
  - Ekstraksi PDF layout & tabel via **MinerU** berpreservasi halaman (*no arbitrary chunking*).
  - Vektor semantik via **Jina Embeddings v4** (8.192 token konteks).
  - Penalaran skor & justifikasi kepatuhan via **DeepSeek LLM** (*Thinking Mode Support*).
  - Analisis dokumen tambahan pasca-FGD berbasis *custom prompt* dengan catatan privat asesor (*Strict Assessor Confidentiality*).
- **Arsitektur 4 Peran (*4-Role RBAC*)**:
  1. `Administrator`: Platform root, master model, konfigurasi global AI, audit logs, manajemen lisensi, CRUD vendor, dan impersonasi vendor.
  2. `Vendor`: Pengelolaan portofolio klien dan penugasan tim konsultan asesmen.
  3. `External Consultant`: Workspace penilaian 42 parameter split-screen, input skor, AI help, dan rekomendasi 2x2.
  4. `Counterpart Team`: Portal mandiri unggah bukti, dokumen tambahan, dan live monitoring progress.
- **Analisis Komparatif Komprehensif**:
  - Komparasi Capaian YoY (*Year-on-Year: Grouped Bar Chart*).
  - Kesenjangan Persepsi Survei Budaya Risiko (*Perception Gap Analysis: Side-by-Side Bar Chart*).
  - Survei budaya risiko publik mobile-friendly tanpa perlu login akun via QR Code.
- **Ekspor Dokumen Baku**: Laporan Ringkasan Hasil PDF resmi (Format 1.2.8) dan sinkronisasi file Excel 100% identik dengan `SCORE RMI.xlsx`.

---

## 🛠️ Tech Stack Resmi

| Lapisan | Teknologi | Catatan |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14+ (App Router, TypeScript)** | Desktop-first dashboard, Tailwind CSS, Shadcn UI |
| **Backend API** | **Express.js (Node.js + TypeScript)** | RESTful modular, Prisma ORM, Zod validation, Helmet |
| **Database** | **PostgreSQL 18** | Row-Level Security (RLS) & pgvector extension |
| **Cache & Queue** | **Redis (Upstash / Local) + BullMQ** | Caching, JWT session rate limit, asynchronous ingestion |
| **Object Storage** | **Cloudflare R2 / AWS S3** | Berkas eviden terenkripsi AES-256 via Presigned URLs |
| **AI Reasoning** | **DeepSeek LLM + Jina AI + MinerU** | RAG semantik multi-tenant terisolasi |

---

## 📁 Struktur Direktori

```
OpenRMI/
├── frontend/                        # Aplikasi Frontend Next.js 14+ (Stand-alone)
│   ├── src/
│   │   ├── app/                     # App Router (admin, vendor, consultant, counterpart, surveys)
│   │   ├── components/              # UI, RMI & Interactive Charts
│   │   ├── hooks/                   # Custom React Hooks
│   │   └── lib/                     # API Client & utils
│   ├── package.json
│   └── tailwind.config.js
│
├── backend/                         # Aplikasi Backend Express.js (Stand-alone)
│   ├── prisma/                      # Skema Database & Seeder Master Data
│   ├── src/
│   │   ├── modules/                 # Feature Modules (Auth, Admin, Vendor, Consultant, Counterpart, Surveys, Reports)
│   │   ├── middlewares/             # Tenant RLS Context, RBAC Guard & Security
│   │   └── server.ts
│   ├── test/                        # 12 Test Suites (Scoring, Security, E2E Full Lifecycle)
│   ├── package.json
│   └── tsconfig.json
```

---

## 💻 Panduan Menjalankan di Lingkungan Lokal

### 1. Menjalankan Backend (Express.js)
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed    # Memasukkan Master Model 42 Parameter & Admin default
npm run dev            # Berjalan di http://localhost:5000
```

### 2. Menjalankan Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev            # Berjalan di http://localhost:3000
```

### 3. Menjalankan Pengujian Otomatis
```bash
# Pengujian Backend (12 Test Suites / 134 Tests lulus 100%)
cd backend
npm test

# Type-checking & Build Verification
npm run build          # Backend TypeScript compile

cd ../frontend
npm run typecheck      # Frontend Type-check
npm run build          # Next.js production build
```

---

## 🚢 Panduan Deployment Produksi

### A. Backend & Database Deployment (Railway)
1. Buat project baru di [Railway](https://railway.app).
2. Tambahkan layanan **PostgreSQL** dan **Redis**.
3. Hubungkan repository GitHub dan atur Root Directory ke `backend`.
4. Railway secara otomatis mendeteksi [`backend/railway.json`](backend/railway.json) dan [`backend/Procfile`](backend/Procfile).
5. Atur Environment Variables sesuai dengan [`backend/.env.example`](backend/.env.example):
   - `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `S3_ENDPOINT`, `S3_BUCKET`, `DEEPSEEK_API_KEY`, `JINA_API_KEY`, `MINERU_API_KEY`.
6. Deploy akan mengeksekusi migrasi Prisma dan menyalakan server di port yang disediakan.

### B. Frontend Deployment (Vercel)
1. Import repositori di [Vercel](https://vercel.com).
2. Set **Root Directory** ke `frontend`.
3. Set **Framework Preset** ke `Next.js`.
4. Tambahkan Environment Variable:
   - `NEXT_PUBLIC_API_URL`: URL Backend Railway Anda (contoh: `https://api.openrmi.yourdomain.com/api/v1`).
5. Klik **Deploy**.

---

## 📄 Lisensi
Hak Cipta © 2026 OpenRMI Project. Seluruh hak cipta dilindungi undang-undang.
