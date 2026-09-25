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
  1. `Administrator`: Platform root, master model, manajemen lisensi, CRUD vendor, dan impersonasi vendor.
  2. `Vendor`: Pengelolaan portofolio klien dan penugasan tim konsultan asesmen.
  3. `External Consultant`: Workspace penilaian 42 parameter, input skor, AI help, dan rekomendasi.
  4. `Counterpart Team`: Portal mandiri unggah bukti, dokumen tambahan, dan live monitoring.
- **Analisis Komparatif Komprehensif**:
  - Komparasi Capaian YoY (*Year-on-Year: Grouped Bar Chart*).
  - Kesenjangan Persepsi Survei Budaya Risiko (*Perception Gap Analysis: Side-by-Side Bar Chart*).
  - Survei budaya risiko publik mobile-friendly tanpa perlu login akun.
- **Ekspor Dokumen Baku**: Laporan Ringkasan Hasil PDF resmi (Format 1.2.8) dan sinkronisasi file Excel 100% identik dengan `SCORE RMI.xlsx`.

---

## 🛠️ Tech Stack Resmi

| Lapisan | Teknologi |
| :--- | :--- |
| **Frontend** | Next.js 14+ (App Router, React 19, TypeScript), Tailwind CSS, Shadcn UI |
| **Backend API** | Express.js (Node.js + TypeScript), Prisma ORM |
| **Database** | PostgreSQL 18 (Row-Level Security & pgvector extension) |
| **Cache & Queue** | Redis (Upstash) + BullMQ Worker |
| **Object Storage** | S3-Compatible Storage (Cloudflare R2) via Presigned URLs |
| **AI & Parser** | DeepSeek LLM, Jina AI Embeddings v4, MinerU Parser |

---

## 📁 Struktur Direktori

```
OpenRMI/
├── frontend/                        # Aplikasi Frontend Next.js 14+ (Stand-alone)
│   ├── src/
│   │   ├── app/                     # App Router
│   │   ├── components/              # UI & RMI Components
│   │   └── lib/                     # API Client & utils
│   └── package.json
│
├── backend/                         # Aplikasi Backend Express.js (Stand-alone)
│   ├── prisma/                      # Skema Database & Migrasi PostgreSQL
│   ├── src/
│   │   ├── modules/                 # Modular Feature Architecture
│   │   ├── middlewares/             # Tenant RLS Context & RBAC Guard
│   │   └── server.ts
│   └── package.json
│
├── PRD.md                           # Dokumen Kebutuhan Produk & Aturan Bisnis
├── DESIGN_SYSTEM.md                 # Design Tokens & Spesifikasi UI
├── ARCHITECTURE.md                  # Arsitektur Sistem & Skema Database
├── AGENTS.md                        # Panduan Khusus Pengembang & AI Agents
└── README.md
```

---

## 📄 Lisensi
Hak Cipta © 2024 OpenRMI Project. Seluruh hak cipta dilindungi undang-undang.
