# Design System & UI/UX Guidelines
# OpenRMI — Multi-Tenant Enterprise Risk Maturity Assessment System

---

## 1. Filosofi & Prinsip Desain

OpenRMI adalah platform enterprise B2B SaaS yang digunakan oleh **Super Admin**, **Konsultan Eksternal (Penilai)**, dan **Tim Counterpart (Perusahaan Klien)** untuk asesmen tingkat kematangan risiko (*Risk Maturity Index*). Karakteristik utama antarmuka didasarkan pada 4 pilar filosofi:

1. **Otoritatif, Tepercaya & Profesional (*Authoritative & Trustworthy*)**:
   Mengadopsi nuansa korporasi modern (*slate navy* dan *corporate blue*) yang mencerminkan standar kepatuhan regulasi Kementerian BUMN dan ketelitian audit tata kelola korporasi.
2. **Kerapatan Data Tinggi & Keterbacaan Optimal (*High Data Density & Legibility*)**:
   Mampu menyajikan matriks evaluasi 42 parameter, puluhan kriteria, cuplikan screenshot bukti, dan formulir reviu secara rapi tanpa membuat pengguna kewalahan (*cognitive overload*).
3. **Transparansi Progres & Kolaborasi Real-Time (*Real-Time Transparency*)**:
   Tim Counterpart dapat memonitor progres kerja konsultan secara instan melalui indikator visual yang jelas, visualisasi diagram laba-laba (*spider chart*), dan bilah kemajuan (*progress bar*).
4. **Kaidah Ergonomi Kerja (*Frictionless Ergonomics*)**:
   Workspace penilaian konsultan dirancang agar asesor dapat membaca dokumen bukti (PDF/gambar) di bilah samping (*side drawer/split-view*) bersamaan dengan pengisian justifikasi skor tanpa perlu berpindah-pindah tab browser.

---

## 2. Fondasi Desain Tokens (Design Tokens)

### 2.1 Palet Warna (Color Palette)

#### A. Brand & Primary Colors (Corporate Navy & Slate)
Warna primer merepresentasikan ketegasan, stabilitas, dan standar kepatuhan enterprise.

| Token | Hex Code | Tampilan / Penggunaan |
| :--- | :---: | :--- |
| `primary-900` | `#0F172A` | Background gelap sidebar, teks judul utama (*headline*), topbar header |
| `primary-800` | `#1E293B` | Elemen navigasi sekunder, card header aktif |
| `primary-700` | `#334155` | Border kuat, teks deskripsi sekunder |
| `brand-blue-700`| `#1D4ED8` | Tombol CTA aktif, link navigasi, state fokus input |
| `brand-blue-600`| `#2563EB` | **Primary Brand Color** (Aksen utama, tab aktif, badge terpilih) |
| `brand-blue-500`| `#3B82F6` | Hover state tombol primer, sorotan bar chart |
| `brand-blue-50` | `#EFF6FF` | Background seleksi baris aktif, alert info, badge terpilih |

#### B. Neutrals & Surface Colors (Netral & Latar Belakang)
| Token | Hex Code | Penggunaan |
| :--- | :---: | :--- |
| `surface-bg` | `#F8FAFC` | Background aplikasi utama (*slate-50*) |
| `surface-card` | `#FFFFFF` | Background kartu, modal dialog, panel tabel |
| `border-subtle`| `#E2E8F0` | Garis pemisah baris tabel, border card (*slate-200*) |
| `border-strong`| `#CBD5E1` | Border input form, garis pembatas kolom (*slate-300*) |
| `text-primary` | `#0F172A` | Teks isi utama, angka skor, heading (*slate-900*) |
| `text-secondary`| `#475569` | Teks penjelasan, label form, keterangan kriteria (*slate-600*) |
| `text-muted` | `#94A3B8` | Placeholder, tanggal log audit, ikon non-aktif (*slate-400*) |

#### C. Semantic Status Colors (Status Kepatuhan & Reviu)
| Status | Token | Hex Code | Penggunaan di OpenRMI |
| :--- | :--- | :---: | :--- |
| **Success** | `emerald-600` | `#059669` | Dokumen Terverifikasi, Status Rekomendasi `S` (Sesuai), Skor 5 |
| **Warning** | `amber-500` | `#D97706` | Perlu Klarifikasi Bukti, Status `BS` (Belum Sesuai), Skor 2–3 |
| **Danger** | `rose-600` | `#E11D48` | Kriteria Terlemah (*Weakest Link*), Status `BD` (Belum Ditindaklanjuti), Skor 1 |
| **Info** | `sky-500` | `#0284C7` | Dokumen Baru Diunggah, Menunggu Reviu Konsultan |
| **Neutral** | `slate-500` | `#64748B` | Status `TDD` (Tidak Dapat Ditindaklanjuti), Kriteria Opsional |

#### D. Spektrum Skala Kematangan RMI (Maturity Spectrum Palette)
Digunakan secara konsisten pada speedometer skor akhir, radar chart, dan badge level kematangan:

```
[ 1.00 - 1.99 ]  Fase Awal         --> #EF4444  (Rose Red)
[ 2.00 - 2.99 ]  Fase Berkembang   --> #F59E0B  (Amber)
[ 3.00 - 3.99 ]  Fase Praktik Baik --> #3B82F6  (Corporate Blue)
[ 4.00 - 4.99 ]  Fase Lebih Baik   --> #6366F1  (Indigo)
[ 5.00 ]         Fase Terbaik      --> #10B981  (Emerald Green)
```

---

### 2.2 Tipografi (Typography Hierarchy)

Font primer aplikasi adalah **Plus Jakarta Sans** (atau alternatif fallback **Inter**) untuk teks UI dan tabular numbers, serta **JetBrains Mono** untuk nomor parameter, kode regulasi, dan formula kalkulasi.

```css
font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
font-mono: 'JetBrains Mono', monospace;
```

| Tingkatan | Ukuran | Weight | Line Height | Contoh Penggunaan |
| :--- | :---: | :---: | :---: | :--- |
| **Display (Hero Score)** | 36px (`2.25rem`) | Bold (700) | 40px | Skor RMI Utama (contoh: `3.4`) |
| **Heading 1 (H1)** | 28px (`1.75rem`) | Bold (700) | 36px | Judul Halaman Workspace Penilaian |
| **Heading 2 (H2)** | 20px (`1.25rem`) | SemiBold (600)| 28px | Judul Dimensi RMI, Kartu Ringkasan |
| **Heading 3 (H3)** | 16px (`1.00rem`) | SemiBold (600)| 24px | Nama Sub-Dimensi, Modal Title |
| **Body Standard** | 14px (`0.875rem`)| Regular (400) | 20px | Deskripsi kriteria, teks dokumen bukti |
| **Body Medium** | 14px (`0.875rem`)| Medium (500)  | 20px | Label form, nama parameter di tabel |
| **Body Small / Meta** | 12px (`0.75rem`) | Regular (400) | 16px | Keterangan upload, tanggal audit trail |
| **Badge / Caption** | 11px (`0.6875rem`)| Bold (700)   | 14px | Status tag (`S`, `BS`, `TERVERIFIKASI`) |
| **Mono Code** | 13px (`0.8125rem`)| Medium (500)  | 18px | Kode Parameter `P-01`, Formula RMI |

---

### 2.3 Sistem Spasi & Radius Sudut (Spacing & Elevation)

- **Grid Spacing**: Berbasis kelipatan 4px (`space-1`: 4px, `space-2`: 8px, `space-3`: 12px, `space-4`: 16px, `space-6`: 24px, `space-8`: 32px).
- **Border Radii**:
  - `rounded-sm`: 4px (badge status kecil, checkbox)
  - `rounded-md`: 6px (input form, tombol, pill skor)
  - `rounded-lg`: 8px (kartu data, panel tabel, dropdown menu)
  - `rounded-xl`: 12px (modal container, panel workspace reviu)
  - `rounded-full`: 9999px (avatar, circular progress indicator)
- **Shadows (Ketinggian UI)**:
  - `shadow-sm`: `0 1px 2px 0 rgb(0 0 0 / 0.05)` (kartu tabel standar)
  - `shadow-md`: `0 4px 6px -1px rgb(0 0 0 / 0.1)` (dropdown, flyout popover)
  - `shadow-lg`: `0 10px 15px -3px rgb(0 0 0 / 0.1)` (modal dialog, side drawer)

---

## 3. Tata Letak Aplikasi (Application Shell & Layout Architecture)

Struktur antarmuka terdiri dari 3 area utama:

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOPBAR: [Tenant Switcher] | Perusahaan Aktif | Periode Asesmen | User  │
├─────────────┬──────────────────────────────────────────────────────────┤
│ SIDEBAR     │ MAIN CONTENT AREA                                        │
│ (Navigasi)  │ ┌──────────────────────────────────────────────────────┐ │
│             │ │ BREADCRUMB & PAGE HEADER                             │ │
│ • Dashboard │ ├──────────────────────────────────────────────────────┤ │
│ • Workspace │ │ METRIC CARDS / WORKFLOW STEPPER                      │ │
│ • Dokumen   │ ├──────────────────────────────────────────────────────┤ │
│ • Wawancara │ │ TABULAR WORKSPACE / SPLIT SCREEN (EVIDENCE + REVIEW) │ │
│ • Rekomend. │ │                                                      │ │
│ • Laporan   │ │                                                      │ │
│             │ └──────────────────────────────────────────────────────┘ │
└─────────────┴──────────────────────────────────────────────────────────┘
```

### 3.1 Komponen Shell
1. **Topbar Multi-Tenant**:
   - Menampilkan identitas Tenant Perusahaan aktif (Logo BUMN + Nama).
   - Indikator Role Pengguna Aktif (`SUPER ADMIN` / `KONSULTAN EKSTERNAL` / `TIM COUNTERPART`).
   - Selector Periode Penilaian (contoh: *Tahun Buku 2023 - Model Umum*).
   - Akses Cepat Log Aktivitas & Profil.
2. **Sidebar Terpadu Sesuai Role**:
   - Menu navigasi dinamis yang otomatis menyesuaikan kewenangan pengguna:
     - **Super Admin**: Tenant Management, Konsultan, Assignment Matrix, Master Regulasi.
     - **Konsultan Eksternal**: Assigned Companies, Evidence Reviewer, Interview Notes, Scoring Sheet, Recommendation Generator, Final Report.
     - **Tim Counterpart**: Upload Bukti Dukung, Monitor Progres Asesor, Draf Review, Tindak Lanjut Rekomendasi.
3. **Workspace Split-Screen (Fitur Kunci Konsultan)**:
   - Panel Kiri (60%): Lembar Evaluasi Parameter, Kriteria, dan Form Catatan Reviu.
   - Panel Kanan (40% / Collapsible Drawer): *Evidence Document Viewer* (menampilkan dokumen PDF yang diunggah Counterpart atau cuplikan screenshot bukti).

---

## 4. Komponen Antarmuka Khusus OpenRMI (Specialized Components)

### 4.1 Matrix Tabel 42 Parameter Penilaian

Tabel evaluasi mengimplementasikan tata letak hierarkis: **Dimensi $\rightarrow$ Sub-Dimensi $\rightarrow$ Parameter $\rightarrow$ Kriteria Evaluasi**.

```
┌────┬─────────────────────────────┬───────────┬──────────────┬──────────────┬──────────────┐
│ No │ Parameter Penilaian         │ Bukti Dok │ Status Reviu │ Skor Kriteria│ Skor Param   │
├────┼─────────────────────────────┼───────────┼──────────────┼──────────────┼──────────────┤
│ 01 │ Internalisasi Budaya Risiko │ 3 Dokumen │ [Terverifikasi] [ 1 ][ 2 ][ 3 ]│ [ 3 ] (Bulat)│
│    │ ├── Kriteria a (Award/Town) │ SK_Dir.pdf│ Memenuhi     │ 1            │              │
│    │ ├── Kriteria b (Jobdesk 3L) │ Jobdesk.pd│ Memenuhi     │ 2            │              │
│    │ └── Kriteria c (Direksi Akt)│ Notulen.pd│ Memenuhi     │ 3  <-- Min   │              │
└────┴─────────────────────────────┴───────────┴──────────────┴──────────────┴──────────────┘
```

- **Fitur Khusus - Weakest Link Alert**:
  Jika terdapat kriteria yang belum terpenuhi dan membatasi skor parameter, sistem menampilkan indikator visual berwarna oranye/merah bertuliskan:
  `[!] Kriteria 'c' membatasi skor maksimal parameter pada nilai 2`.

---

### 4.2 Evidence Uploader & Checklist Kebutuhan Dokumen (Tim Counterpart)

Komponen ini dirancang untuk memudahkan Tim Counterpart mengunggah berkas sesuai daftar dokumen resmi:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Parameter 01 - Kriteria c: Keterlibatan Aktif Direksi                  │
│ Dokumen Wajib:                                                         │
│ • Notulen Rapat / Absensi Sosialisasi Program Budaya Risiko Direksi   │
│ • Surat Keputusan Direksi Program Budaya Kerja                         │
├────────────────────────────────────────────────────────────────────────┤
│ [ Area Drag & Drop Berkas (PDF, PNG, JPG, XLSX - Max 100MB) ]          │
│                                                                        │
│ Terunggah:                                                             │
│ 📄 SK_Direksi_Budaya_Risiko_2023.pdf  (2.4 MB)  [Lihat] [Hapus]        │
│    Catatan Counterpart: "Tercantum pada Bab III Halaman 12-14"         │
│ 🖼️ Absensi_Townhall_Direksi.jpg       (840 KB)  [Lihat] [Hapus]        │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4.3 Screenshot & Snippet Embedder (Konsultan Eksternal)

Menggantikan kolom L spreadsheet (*Screen shoot Dokumen*). Memungkinkan konsultan menangkap atau mengunggah potongan bukti spesifik dan menyematkannya langsung di bawah catatan reviu kriteria:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Reviu Dokumen (Catatan Konsultan):                                     │
│ "Berdasarkan SK No. 102/2023 Pasal 4, Direksi telah mewajibkan..."    │
│                                                                        │
│ Cuplikan Bukti Terlampir:                                              │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ [Thumbnail Screenshot: Pasal 4 Surat Keputusan Budaya Risiko]      │ │
│ │ "Sumber: SK_Direksi_Budaya_Risiko_2023.pdf (Hal 12)"               │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ [+ Tambah Cuplikan Screenshot Baru]                                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4.4 Dashboard Monitoring Progres Pekerjaan Asesor (Tim Counterpart)

Dirancang agar tim internal perusahaan dapat memantau jalannya asesmen secara transparan tanpa perlu bertanya manual melalui chat/email:

```
┌────────────────────────────────────────────────────────────────────────┐
│ MONITORING PROGRES PENILAIAN RMI — TAHUN BUKU 2023                     │
│ Konsultan Penilai: PT Konsultan Utama Riskindo (Assigned)              │
├────────────────────────────────────────────────────────────────────────┤
│ Tahapan Penilaian:                                                     │
│ [1. Upload Bukti: 100%] ──> [2. Reviu Dokumen: 68%] ──> [3. Wawancara] │
│                                                                        │
│ Status Reviu Dokumen:                                                  │
│ • Total Parameter: 42 Parameter                                        │
│ • Selesai Direviu: 29 Parameter (69%)                                  │
│ • Menunggu Klarifikasi Counterpart: 3 Catatan                          │
│ • Belum Direviu: 10 Parameter                                          │
│                                                                        │
│ Draf Skor Sementara (Live Preview):                                    │
│ • Dimensi 1 (Budaya): 3.67  |  Dimensi 2 (Tata Kelola): 3.12          │
│ • Dimensi 3 (Kerangka): 3.40|  Dimensi 4 (Proses): 2.85 (Perlu Perhatian)
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4.5 Visualisasi Skor & Speedometer Kematangan RMI

- **Diagram Radar (Spider Chart 5 Dimensi)**: Menampilkan profil maturitas 5 dimensi secara simultan, membandingkan target BUMN ($\ge 3.00$) dengan realisasi penilaian.
- **Speedometer Gauge**: Visualisasi skor komposit akhir (1.00 s.d. 5.00) dengan indikasi potongan penalti Aspek Kinerja (contoh: *Skor Dimensi 3.40 - Penalti Kinerja 0.50 = Skor RMI 2.90*).

---

### 4.6 Matriks Prioritas Rekomendasi 2x2 (Impact vs Ease)

Menyajikan peta kuadran rekomendasi perbaikan secara interaktif:

```
    TINGGI │ [ KUADRAN II ]              │ [ KUADRAN I ] (PRIORITAS 1)
           │ Dampak Tinggi / Sulit       │ Dampak Tinggi / Mudah
           │ (Contoh: Sistem IT MR Core) │ (Contoh: Update Kebijakan Dekom)
   DAMPAK  │                             │
    ───────┼─────────────────────────────┼──────────────────────────────
    RENDAH │ [ KUADRAN III ]             │ [ KUADRAN II ]
           │ Dampak Rendah / Sulit       │ Dampak Rendah / Mudah
           │ (Prioritas Terakhir)        │ (Quick Wins Sederhana)
           └─────────────────────────────┴──────────────────────────────
                        SULIT                         MUDAH
                             KEMUDAHAN IMPLEMENTASI
```

---

### 4.7 Tombol "AI Help" & Panel Rekomendasi Penilaian Cerdas (Workspace Asesor)

Fitur khusus Konsultan Eksternal untuk menganalisis dokumen bukti secara instan menggunakan RAG (MinerU + Jina + DeepSeek) tanpa perlu membolak-balik ratusan halaman PDF secara manual:

#### A. Tampilan Tombol Aksi di Baris Parameter Penilaian
```
┌────────────────────────────────────────────────────────────────────────┐
│ Parameter 01: Internalisasi Budaya Risiko     [ ✨ AI Help (Analisis) ]│
└────────────────────────────────────────────────────────────────────────┘
```
- **Styling Token**:
  - `class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white rounded-md bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-sm transition-all focus:ring-2 focus:ring-purple-400"`
  - Ikon: Sparkles SVG (warna kuning cerah `#FDE047` atau putih).
  - State Loading: Animasi spin + teks *"Menganalisis Eviden..."*.

#### B. Panel Drawer Rekomendasi AI (Slide-Over Panel Kanan - 480px)
```
┌────────────────────────────────────────────────────────────────────────┐
│ ✨ Rekomendasi Penilaian AI — Parameter 01             [✕ Tutup]       │
│ Model: DeepSeek-V3 RAG | Konteks: 8 Chunks Eviden (MinerU + Jina)      │
├────────────────────────────────────────────────────────────────────────┤
│ 🎯 Ringkasan Skor Rekomendasi:                                         │
│ • Skor Parameter Rekomendasi: [ 2 ] (Berdasarkan Aturan Terendah)      │
│ • Catatan: Kriteria c membatasi skor maksimal karena belum lengkap.    │
├────────────────────────────────────────────────────────────────────────┤
│ 📋 Rekomendasi per Kriteria:                                           │
│                                                                        │
│ ▷ Kriteria a: Program Penanaman Budaya Sadar Risiko                    │
│    Rekomendasi Skor: [ 3 ]  (Tingkat Keyakinan: Tinggi 94%)            │
│    📄 Sumber: Laporan_Sosialisasi_MR_2023.pdf                          │
│    🏷️ Halaman: [ Halaman 18 ]                                          │
│    💬 Kutipan Eviden:                                                  │
│       "Perusahaan telah menyelenggarakan 4 kali sosialisasi budaya     │
│        risiko dan risk townhall sepanjang tahun 2023..."               │
│    📝 Justifikasi: Pelaksanaan telah terbukti >1 kali setahun.         │
│                                                                        │
│ ▷ Kriteria c: Peran Aktif Direksi                                      │
│    Rekomendasi Skor: [ 2 ]  <-- Weakest Link                           │
│    📄 Sumber: Notulen_Rapat_Direksi_Bulan_Juni.pdf                     │
│    🏷️ Halaman: [ Halaman 7 ]                                           │
│    ⚠️ Celah (Gap): Belum ada SK Direksi formal penetapan reward/KPI    │
├────────────────────────────────────────────────────────────────────────┤
│ [ ✅ Terapkan Semua Nilai & Kutipan ]    [ Salin Catatan Reviu Saja ]  │
│ *Otomatis mengisi form skor kriteria, catatan reviu (Kolom J), dan     │
│ referensi bukti (Kolom L) ke workspace penilaian konsultan.            │
└────────────────────────────────────────────────────────────────────────┘
```

---

---

### 4.8 Konsol Administrator Platform (Master Model, Konfigurasi AI & Health Check)

Konsol khusus bagi **Administrator Platform** (Root) untuk mengontrol infrastruktur global, regulasi master KBUMN, dan mesin AI terpusat:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🛡️ ADMINISTRATOR PLATFORM CONSOLE                                      │
│ Navigasi: [ Master Model ] [ Konfigurasi AI ] [ Health Check ] [ Audit]│
├────────────────────────────────────────────────────────────────────────┤
│ ⚙️ PENGATURAN GLOBAL AI ENGINE & RAG PIPELINE                          │
│ Konfigurasi kredensial dan parameter model untuk seluruh penyewa       │
├────────────────────────────────────────────────────────────────────────┤
│ 🔑 Kredensial API Eksternal                                            │
│ • DeepSeek API Key: [ sk-5fc4•••••••••••••••••••••••••••••••••••• ]    │
│ • DeepSeek Base URL:[ https://api.deepseek.com                   ]    │
│ • Jina AI Key:      [ jina_f4a1•••••••••••••••••••••••••••••••••• ]    │
│ • MinerU API Key:   [ sk-UPh2•••••••••••••••••••••••••••••••••••• ]    │
│                                                                        │
│ 🧠 Pengaturan Model LLM (DeepSeek)                                     │
│ • Model Inferensi:                                                     │
│   (●) `deepseek-flash`  — DeepSeek-V4.1-Flash (Cepat, Efisien)         │
│   ( ) `deepseek-v4-pro` — DeepSeek-V4-Pro-0813 (Penalaran Kompleks)   │
│                                                                        │
│ • Mode Berpikir (Thinking Mode):                                       │
│   [ ON (Aktif) 🟩 ]  Mode Penalaran Berantai (Chain-of-Thought)        │
│   *Dianjurkan aktif untuk menghasilkan kutipan klausul & justifikasi   │
│    penilaian yang transparan sesuai format audit KBUMN.                │
│                                                                        │
│ • Suhu / Temperature:  [ 0.10 ] (Akurasi deterministik regulasi BUMN)  │
│ • Max Output Tokens:   [ 4096 ] tokens per respon inferensi            │
├────────────────────────────────────────────────────────────────────────┤
│ 🧬 Pengaturan Model Embedding (Jina AI)                                │
│ • Model Embedding Vektor:                                              │
│   (●) `jina-embeddings-v4` — Multimodal, Multilingual, 8K Konteks      │
│   ( ) `jina-embeddings-v3` — Generasi Sebelumnya (8K Konteks Teks)     │
├────────────────────────────────────────────────────────────────────────┤
│ 🖥️ STATUS KESEHATAN SISTEM (SYSTEM HEALTH CHECK)                       │
│ • PostgreSQL 18 RLS: [ 🟢 SEHAT (12ms) ] • Redis Cache: [ 🟢 SEHAT ]    │
│ • BullMQ RAG Worker: [ 🟢 AKTIF (0 antrean tertunda) ]                 │
│ • Storage Object S3: [ 🟢 TERHUBUNG (Presigned URL OK) ]               │
├────────────────────────────────────────────────────────────────────────┤
│ [ 🧪 Uji Koneksi API (Ping) ]                [ 💾 Simpan Konfigurasi ] │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4.9 Manajemen Akun Vendor & Banner Mode Impersonate (Administrator Console)

Administrator dapat mengelola lembaga konsultan penilai (*Vendors*) serta masuk ke lingkungan vendor (*impersonate*) untuk asistensi:

#### A. Tabel Manajemen Akun Vendor (CRUD Vendor)
```
┌────────────────────────────────────────────────────────────────────────┐
│ 🏢 DAFTAR LEMBAGA VENDOR KONSULTAN                    [+ Tambah Vendor]│
├────────────────────────────────────────────────────────────────────────┤
│ • PT Konsultan Utama Riskindo (Kode: VEND-001)                         │
│   Email: admin@riskindo.co.id | Kuota Tenant: 12 / 15 Tenant Klien     │
│   Status Lisensi: [ 🟢 ACTIVE ] (Hingga 31 Des 2025)                   │
│   Aksi: [ 🎭 Impersonate ]  [ ✏️ Edit ]  [ ⏸️ Suspend ]                │
├────────────────────────────────────────────────────────────────────────┤
│ • GRC Advisory Prima (Kode: VEND-002)                                  │
│   Email: contact@grcadvisory.id | Kuota Tenant: 4 / 5 Tenant Klien     │
│   Status Lisensi: [ 🟢 ACTIVE ] (Hingga 30 Jun 2025)                   │
│   Aksi: [ 🎭 Impersonate ]  [ ✏️ Edit ]  [ ⏸️ Suspend ]                │
└────────────────────────────────────────────────────────────────────────┘
```

#### B. Floating Banner Visual Mode Impersonate (Sticky Top Bar)
Saat Administrator melakukan impersonasi ke Vendor tertentu, sistem wajib memunculkan banner mengambang berwarna oranye-kuning di bagian paling atas layar:

```
┌────────────────────────────────────────────────────────────────────────┐
│ ⚠️ MODE IMPERSONASI AKTIF: Anda sedang bertindak atas nama Vendor      │
│ "PT Konsultan Utama Riskindo (VEND-001)". Semua tindakan tercatat log. │
│                                   [ ✕ Akhiri & Kembali ke Admin ]      │
└────────────────────────────────────────────────────────────────────────┘
```
- **Styling Token Impersonate Banner**:
  - Container: `class="sticky top-0 z-50 flex items-center justify-between px-6 py-2.5 bg-amber-500 text-slate-950 font-medium text-sm shadow-md animate-pulse-slow"`
  - Exit Button: `class="px-3 py-1 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-black transition-colors focus:ring-2 focus:ring-white"`

---

### 4.10 Komponen Unggah & Manajemen Dokumen Tambahan Pasca-FGD (Tim Counterpart)

Tab khusus di portal Counterpart untuk mengunggah dokumen susulan pasca-FGD/klarifikasi tanpa mencemari berkas eviden utama per parameter:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 📁 DOKUMEN TAMBAHAN & KLARIFIKASI PASCA-FGD                            │
│ Unggah dokumen pendukung susulan yang diminta oleh Tim Asesor/Konsultan │
├────────────────────────────────────────────────────────────────────────┤
│ [+ Unggah Dokumen Tambahan Baru]                                       │
│                                                                        │
│ DAFTAR DOKUMEN TERUNGGAH (3 Dokumen):                                  │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 📄 Notulen_FGD_Klarifikasi_KRI_BOD.pdf (3.4 MB)                    │ │
│ │ Kategori: [ Notulen Klarifikasi FGD ] • 18 Agu 2024                 │ │
│ │ Catatan: "Notulen pembahasan KRI bersama Direktur Kepatuhan & MR"  │ │
│ │ Status AI Ingestion: [ ✅ Terindeks RAG (MinerU + Jina) ]          │ │
│ │ Aksi: [ 📥 Unduh ] [ 🗑️ Hapus ]                                    │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ 📄 Revisi_Pedoman_Pelaporan_Insiden_2024.docx (1.8 MB)             │ │
│ │ Kategori: [ Kebijakan Revisi ] • 19 Agu 2024                        │ │
│ │ Catatan: "Penyempurnaan klausul batas eskalasi 1x24 jam"           │ │
│ │ Status AI Ingestion: [ ⏳ Sedang Diproses OCR MinerU (65%) ]        │ │
│ │ Aksi: [ 📥 Unduh ]                                                 │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```
- **Modal Unggah Dokumen Tambahan**:
  - Kolom Pilihan Kategori: Dropdown (`Notulen Klarifikasi FGD`, `Kebijakan Revisi`, `Klarifikasi Parameter Tertentu`, `Data Kuantitatif`, `Lainnya`).
  - Kolom Catatan Pengajuan: Textarea opsional konteks penyerahan berkas.
  - Drag-and-drop zone dengan validasi ekstensi (`.pdf`, `.docx`, `.xlsx`, max 50MB).

---

### 4.11 Modal AI Analisis Kustom & Kartu Catatan Privat Asesor (Workspace Konsultan)

Fitur canggih bagi Asesor untuk mengeksekusi instruksi khusus (*custom prompt*) terhadap dokumen tambahan, dengan **jaminan privasi mutlak** (catatan dan hasil hanya dapat dilihat dan diedit oleh Asesor):

#### A. Modal Perintah AI Analisis (Custom Prompt Modal)
```
┌────────────────────────────────────────────────────────────────────────┐
│ 🤖 Analisis Cerdas Dokumen Tambahan                    [✕ Tutup]       │
│ Berkas: Notulen_FGD_Klarifikasi_KRI_BOD.pdf (Hal 1–14)                 │
├────────────────────────────────────────────────────────────────────────┤
│ 💡 Saran Instruksi Cepat:                                              │
│ [ Identifikasi Komitmen Direksi ]  [ Analisis Gap Batas Toleransi ]    │
│ [ Verifikasi Klausul Eskalasi ]    [ Ringkas Tindak Lanjut Utama ]     │
│                                                                        │
│ 📝 Perintah / Instruksi Khusus Asesor (Custom Prompt):                 │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Temukan apakah dalam notulen ini Direksi menyetujui penambahan     │ │
│ │ batas limit deviasi risiko kredit, dan sebutkan nomor halaman serta│ │
│ │ kutipan pernyataannya.                                             │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ [ ✨ Jalankan Analisis AI ]                    [ Batal ]               │
└────────────────────────────────────────────────────────────────────────┘
```

#### B. Kartu Hasil Analisis & Catatan Privat Asesor (Assessor-Only Workspace)
```
┌────────────────────────────────────────────────────────────────────────┐
│ 🔒 HASIL ANALISIS DOKUMEN (HANYA TERLIHAT OLEH ASESOR)                 │
│ Dokumen: Notulen_FGD_Klarifikasi_KRI_BOD.pdf | Analisis: 18 Agu 14:32  │
├────────────────────────────────────────────────────────────────────────┤
│ 🏷️ Badge Privasi: [ 🔒 Catatan Privat Konsultan Eksternal ]           │
│ *Tim Counterpart tidak memiliki akses melihat temuan dan catatan ini.   │
├────────────────────────────────────────────────────────────────────────┤
│ 🤖 Ringkasan AI (DeepSeek RAG):                                        │
│ "Direksi menyetujui relaksasi batas deviasi risiko kredit dengan syarat │
│ mitigasi berlapis dan review mingguan oleh Komite Pemantau Risiko."   │
│                                                                        │
│ 📄 Referensi Halaman: [ Halaman 6, Paragraf 3 ]                         │
│ 💬 Kutipan Dokumen:                                                    │
│   "Poin 4: Direktur Utama menegaskan bahwa deviasi toleransi NPL 3.2%   │
│    hanya diizinkan sampai Q3 2024 dengan mitigasi pengawasan ketat..." │
├────────────────────────────────────────────────────────────────────────┤
│ ✍️ Catatan Analisis Internal Asesor (Dapat Diedit):                    │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Catatan Asesor:                                                    │ │
│ │ Temuan ini menunjukkan parameter 21 kriteria b telah terpenuhi     │ │
│ │ sebagian, namun perlu pembuktian realisasi mitigasi di Q4.         │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ [ 💾 Simpan Catatan Internal Asesor ]                                  │
└────────────────────────────────────────────────────────────────────────┘
```
---

### 4.12 Form Input Skor RMI Tahun Sebelumnya (Baseline Historis - Opsional)

Antarmuka kolaboratif yang dapat diakses dan disunting bersama oleh **Konsultan Eksternal** maupun **Tim Counterpart (Responden Internal)** untuk memasukkan garis dasar (*baseline*) hasil penilaian periode lalu:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 📊 INPUT SKOR RMI TAHUN SEBELUMNYA (BASELINE HISTORIS)   [⚙️ Opsional] │
│ Tahun Observasi Sebelumnya: [ 2022 ]                                   │
├────────────────────────────────────────────────────────────────────────┤
│ 🏆 Ringkasan Komposit Tahun Sebelumnya:                                │
│ • Skor Aspek Dimensi: [ 3.12 ]  • Penyesuaian Kinerja: [ -0.25 ]       │
│ • Skor Akhir RMI:     [ 2.87 ]  • Fase Kematangan:     [ Berkembang (+)│
├────────────────────────────────────────────────────────────────────────┤
│ 📐 Skor 5 Dimensi Tahun Sebelumnya (Wajib jika baseline diaktifkan):   │
│ • Dimensi 1 (Budaya & Kapabilitas):          [ 2.67 ]                  │
│ • Dimensi 2 (Organisasi & Tata Kelola):      [ 3.18 ]                  │
│ • Dimensi 3 (Kerangka Risiko & Kepatuhan):   [ 3.35 ]                  │
│ • Dimensi 4 (Proses & Kontrol Risiko):       [ 2.80 ]                  │
│ • Dimensi 5 (Model, Data & Teknologi):       [ 3.60 ]                  │
├────────────────────────────────────────────────────────────────────────┤
│ ▾ Rincian Skor 42 Parameter Tahun Sebelumnya (Opsional - Klik Buka)    │
│   Parameter 01: [ 2 ] | Parameter 02: [ 3 ] | Parameter 03: [ 3 ] ...  │
├────────────────────────────────────────────────────────────────────────┤
│ Terakhir diperbarui oleh: Budi Prasetyo (Counterpart) pada 14 Agu 10:15 │
│ [ 💾 Simpan Nilai Historis Baseline ]                                  │
└────────────────────────────────────────────────────────────────────────┘
```
- **Styling Token**:
  - Container: `border border-slate-200 dark:border-slate-800 rounded-panel bg-white dark:bg-navy-900 p-6 shadow-subtle`.
  - Input Angka Desimal: `font-mono text-center font-bold border-slate-300 dark:border-slate-700 focus:ring-brand-500 rounded-md py-1.5 w-24`.

---

### 4.13 Diagram Batang Komparatif YoY (Tahun Berjalan vs Tahun Sebelumnya)

Visualisasi komparatif yang disajikan di workspace Konsultan (analitik) serta di dashboard Vendor dan Counterpart (**Read-Only**):

```
┌────────────────────────────────────────────────────────────────────────┐
│ 📈 PERBANDINGAN CAPAIAN RMI YEAR-ON-YEAR (YoY: 2023 vs 2022)           │
│ Legend: [■ Biru: 2023 (Saat Ini)]  [■ Abu-abu: 2022 (Tahun Lalu)]      │
│ Status Hak Akses: [ 👁️ Read-Only untuk Vendor & Counterpart ]          │
├────────────────────────────────────────────────────────────────────────┤
│ 5.0 │                                                                  │
│ 4.0 │            +0.48         +0.25         -0.15                     │
│     │            ┌──┐          ┌──┐          ┌──┐                      │
│ 3.0 │     +0.66  │  │ ┌──┐     │  │ ┌──┐     │  │ ┌──┐          +0.38  │
│     │     ┌──┐   │  │ │  │     │  │ │  │     │  │ │  │   ┌──┐   ┌──┐   │
│ 2.0 │ ┌──┐│  │   │  │ │  │ ┌──┐│  │ │  │ ┌──┐│  │ │  │   │  │   │  │   │
│     │ │  ││  │   │  │ │  │ │  ││  │ │  │ │  ││  │ │  │   │  │   │  │   │
│ 1.0 │ │  ││  │   │  │ │  │ │  ││  │ │  │ │  ││  │ │  │   │  │   │  │   │
│ 0.0 └─┴──┴┴──┴───┴──┴─┴──┴─┴──┴┴──┴─┴──┴─┴──┴┴──┴─┴──┴───┴──┴───┴──┴───
│        Dimensi 1    Dimensi 2    Dimensi 3    Dimensi 4    Dimensi 5   TOTAL RMI
│        (Budaya)    (TataKelola)  (Kerangka)    (Proses)    (Teknologi)
│  2022:   2.67         3.18         3.35         2.80         3.60        2.87
│  2023:   3.33         3.66         3.60         2.65         3.60        3.25
│ Delta:  (+0.66 ▲)    (+0.48 ▲)    (+0.25 ▲)    (-0.15 ▼)    ( 0.00 ▬)   (+0.38 ▲)
├────────────────────────────────────────────────────────────────────────┤
│ 💡 Catatan Analisis Asesor (Konsultan):                                │
│ "Peningkatan tertinggi terjadi pada Dimensi 1 Budaya Risiko (+0.66),   │
│ namun Dimensi 4 Proses mengalami regresi (-0.15) akibat keterlambatan  │
│ pelaporan profil risiko triwulan 3."                                   │
└────────────────────────────────────────────────────────────────────────┘
```
- **Styling Token Diagram Batang YoY**:
  - Batang Tahun Berjalan: `bg-brand-600 hover:bg-brand-700 transition-all rounded-t-sm shadow-sm`.
  - Batang Tahun Lalu (Baseline): `bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 rounded-t-sm`.
  - Delta Badge Positif: `text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded`.
  - Delta Badge Negatif: `text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded`.

---

### 4.14 Diagram Batang Perbandingan Skor Asesor vs Survei Budaya (Perception Gap)

Membandingkan secara visual antara temuan objektif dokumen bukti oleh Konsultan dengan persepsi responden internal dari survei:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 👥 ANALISIS KESENJANGAN PERSEPSI: ASESOR vs HASIL SURVEI KARYAWAN       │
│ Parameter 01: Internalisasi Budaya Sadar Risiko (Tahun 2023)           │
│ Legend: [■ Biru: Skor Objektif Asesor]  [■ Ungu: Skor Survei Karyawan] │
├────────────────────────────────────────────────────────────────────────┤
│ 5.0 │                                                                  │
│ 4.0 │      GAP: +1.12        GAP: +0.40        GAP: +0.75              │
│     │     (Overconfident)     (Selaras)       (Perlu Edukasi)          │
│ 3.0 │            ┌──┐              ┌──┐              ┌──┐              │
│     │            │  │              │  │              │  │              │
│ 2.0 │     ┌──┐   │  │       ┌──┐   │  │       ┌──┐   │  │              │
│     │     │  │   │  │       │  │   │  │       │  │   │  │              │
│ 1.0 │     │  │   │  │       │  │   │  │       │  │   │  │              │
│ 0.0 └─────┴──┴───┴──┴───────┴──┴───┴──┴───────┴──┴───┴──┴──────────────
│        Kriteria a: Program      Kriteria b: Monev       Kriteria c: Peran
│        Sosialisasi Budaya       Efektivitas Budaya      Aktif Direksi
│  Asesor:     2.00                     3.00                     2.00
│  Survei:     3.12                     3.40                     2.75
│  Kesenjangan: +1.12 (Tinggi)           +0.40 (Wajar)            +0.75 (Sedang)
├────────────────────────────────────────────────────────────────────────┤
│ 🔍 Kesimpulan Gap Analysis (Insight Asesor):                           │
│ "Karyawan merasa sosialisasi budaya risiko sudah sangat baik (Skor 3.12),│
│ namun secara bukti kepatuhan dokumen (SK & Laporan Realisasi) belum ada│
│ sertifikasi kompetensi formal (Skor Bukti Asesor 2.00)."              │
└────────────────────────────────────────────────────────────────────────┘
```
- **Styling Token Diagram Batang Gap**:
  - Batang Asesor (Objektif Bukti): `bg-brand-600 rounded-t-sm`.
  - Batang Survei (Persepsi Karyawan): `bg-purple-500 rounded-t-sm`.
  - Badge Kesenjangan Tinggi (*Overconfident*): `bg-amber-100 text-amber-900 border border-amber-300 text-xs px-2 py-0.5 rounded font-bold`.
  - Mode Read-Only: Tampilan diagram batang ini otomatis muncul di tab pemantauan Tim Counterpart dan Vendor tanpa opsi mengubah formula/catatan.

---

## 5. Konfigurasi Tailwind CSS (Design Tokens Implementation)

Pengembang dapat menyalin konfigurasi theme token berikut ke dalam file `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        navy: {
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        rmi: {
          awal: '#EF4444',       // 1.00 - 1.99
          berkembang: '#F59E0B', // 2.00 - 2.99
          baik: '#3B82F6',       // 3.00 - 3.99
          lebihbaik: '#6366F1',  // 4.00 - 4.99
          terbaik: '#10B981',    // 5.00
        },
        status: {
          sesuai: '#059669',     // S
          belumsesuai: '#D97706',// BS
          belumtindak: '#E11D48',// BD
          tidakdapat: '#64748B', // TDD
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.04)',
        'elevated': '0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.06)',
        'modal': '0 20px 25px -5px rgb(15 23 42 / 0.12), 0 8px 10px -6px rgb(15 23 42 / 0.08)',
      },
      borderRadius: {
        'card': '8px',
        'panel': '12px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

---

## 6. Standar Aksesibilitas (Accessibility & a11y)

1. **Rasio Kontras Warna (WCAG 2.1 Level AA)**:
   - Teks normal memiliki kontras minimal **4.5:1** terhadap latar belakang.
   - Angka skor dan teks heading memiliki kontras minimal **7:1**.
2. **Navigasi Keyboard Efisien**:
   - Seluruh sel penilaian skor kriteria mendukung navigasi tombol panah keyboard (`ArrowUp`, `ArrowDown`, `Tab`) dan input langsung angka `1-5` untuk mempercepat kerja asesor.
3. **Indikator Visual Non-Warna**:
   - Status penilaian tidak hanya bergantung pada warna, tetapi wajib disertai ikon dan label teks (contoh: ikon centang hijau untuk `Memenuhi`, tanda seru oranye untuk `Belum Memenuhi`).

---

## 7. Strategi Responsif & Resolusi Layar

- **Desktop-First (Optimasi Utama: 1280px – 1920px)**:
  Workspace penilaian 42 parameter dan split-screen reviewer dirancang optimal untuk monitor desktop/laptop profesional.
- **Resolusi Menengah (Tablet / 1024px – 1279px)**:
  Side drawer dokumen bukti berubah menjadi mode *overlay/modal* yang dapat ditutup buka dengan cepat.
- **Mobile (Smartphone / < 768px)**:
  Difokuskan untuk:
  - Tim Counterpart: Memantau ringkasan progress bar dashboard dan persetujuan notifikasi.
  - Responden: Mengisi kuesioner survei budaya risiko secara mobile-friendly.

---
*Dokumen DESIGN_SYSTEM.md ini menjadi panduan resmi implementasi antarmuka pengguna (UI/UX) platform OpenRMI.*
