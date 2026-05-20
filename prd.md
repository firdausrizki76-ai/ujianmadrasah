Product Requirements Document (PRD)
Aplikasi Ujian Online Madrasah

Versi: 1.0.0
Tanggal: 18 Mei 2026
Status: Draft
Tim: Product, Engineering, Design

Daftar Isi

Ringkasan Eksekutif
Tujuan & Sasaran
Stakeholder
Arsitektur Sistem
Peran Pengguna (User Roles)
Fitur & Kebutuhan Fungsional
Kebutuhan Non-Fungsional
Alur Pengguna (User Flow)
Skema Database (Supabase)
Desain UI/UX
Keamanan & Integritas Ujian
Milestone & Prioritas
Risiko & Mitigasi
Glossary


1. Ringkasan Eksekutif
Aplikasi Ujian Online Madrasah adalah platform ujian berbasis web yang dirancang untuk memudahkan pelaksanaan ujian di lingkungan madrasah secara digital. Aplikasi ini menggantikan proses ujian berbasis kertas dengan sistem yang lebih efisien, terukur, dan terintegritas tinggi.
Pernyataan Masalah
Madrasah masih mengandalkan ujian berbasis kertas yang membutuhkan biaya cetak tinggi, proses koreksi manual yang lambat, dan rentan terhadap kecurangan. Tidak ada sistem terpusat untuk mengelola soal, jadwal, dan hasil ujian.
Solusi
Platform ujian online terpusat dengan fitur anti-kecurangan, penilaian otomatis, import soal dari Word, dukungan rumus matematika, dan aksesibilitas lintas perangkat (HP & laptop).

2. Tujuan & Sasaran
Tujuan Bisnis

Mendigitalisasi proses ujian madrasah secara menyeluruh
Mengurangi biaya operasional ujian (cetak, kertas, distribusi)
Mempercepat proses penilaian dan pelaporan hasil ujian

Sasaran Produk (OKR)
ObjectiveKey ResultUjian berjalan tanpa gangguan teknisUptime ≥ 99.5% saat jam ujianIntegritas ujian terjagaDeteksi dan catat 100% kejadian tab switchingEfisiensi guru meningkatWaktu koreksi pilihan ganda = 0 menit (otomatis)Aksesibilitas tinggiBerjalan baik di layar ≥ 360px (HP entry-level)

3. Stakeholder
PeranNama / TimKepentinganProduct OwnerKepala MadrasahKeputusan fitur & prioritasEnd User - SiswaPeserta ujianMengerjakan ujianEnd User - GuruPengampu mata pelajaranMembuat & menilai soalEnd User - AdminStaf IT / Tata UsahaMengelola jadwal & userTech LeadTim EngineeringArsitektur & implementasi

4. Arsitektur Sistem
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
│         React / Next.js — Responsive (HP & Laptop)       │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────┐
│              FRONTEND HOSTING                            │
│                   Vercel (Serverless)                    │
│         Next.js App Router + Edge Functions              │
└────────────────────┬────────────────────────────────────┘
                     │ Supabase Client SDK / REST API
┌────────────────────▼────────────────────────────────────┐
│                  BACKEND — Supabase                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  PostgreSQL  │  │  Auth (JWT)  │  │  Storage       │  │
│  │  Database    │  │  Email/OTP   │  │  (using refresh token google drive) │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐ │
│  │            Row Level Security (RLS)                  │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │         Realtime (monitor status ujian)              │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
Stack Teknologi
LayerTeknologiFrontend FrameworkNext.js 14+ (App Router)UI LibraryTailwind CSS + Shadcn/UIRendering MathKaTeX / MathJaxImport WordMammoth.js (client-side .docx parser)State ManagementZustand / React ContextBackend & DBSupabase (PostgreSQL)AuthSupabase Auth (Email + Magic Link)File StorageSupabase StorageHostingVercel (Serverless Functions)TimerServer-synchronized countdown

5. Peran Pengguna (User Roles)
5.1 Admin

Mengelola akun guru dan siswa (CRUD)
Membuat & mengatur jadwal ujian
Melihat semua laporan dan hasil ujian
Mengatur konfigurasi sistem (durasi, kuota kelas)

5.2 Guru

Membuat bank soal (manual atau import dari Word)
Membuat paket ujian dari bank soal
Melihat hasil ujian mata pelajaran yang diampu
Menilai jawaban essay
Melihat log kecurangan per siswa

5.3 Siswa

Login dan mengakses ujian yang dijadwalkan
Mengerjakan ujian (pilihan ganda & essay)
Melihat nilai setelah ujian selesai
Melihat riwayat ujian yang telah diselesaikan


6. Fitur & Kebutuhan Fungsional
6.1 Manajemen Soal (Bank Soal)
FR-001: Buat Soal Manual

Guru dapat membuat soal pilihan ganda dengan 2–6 pilihan jawaban
Guru dapat membuat soal essay dengan panduan penskoran (rubrik)
Soal dapat mengandung teks biasa, rumus matematika (LaTeX), dan gambar
Soal dapat diorganisir berdasarkan mata pelajaran, kelas, dan tingkat kesulitan

FR-002: Import Soal dari Word (.docx)

Sistem mendukung upload file .docx dan parsing otomatis soal
Format template Word yang didukung:

  1. Pertanyaan di sini
  A. Pilihan A
  B. Pilihan B
  C. Pilihan C
  D. Pilihan D
  Jawaban: A

  2. [Essay] Jelaskan pengertian...
  Bobot: 20

Soal yang berhasil diparse ditampilkan dalam preview sebelum disimpan
Guru dapat mengedit soal hasil import sebelum disimpan ke bank soal
Soal yang gagal diparse ditampilkan dalam daftar error dengan keterangan

FR-003: Dukungan Rumus Matematika

Editor soal mendukung penulisan rumus dalam format LaTeX inline ($...$) dan block ($$...$$)
Preview rumus ditampilkan secara real-time saat guru mengetik
Rendering menggunakan KaTeX pada sisi client untuk performa tinggi
Contoh yang didukung: pecahan, akar, integral, sigma, limit, pangkat

6.2 Manajemen Ujian
FR-004: Buat Paket Ujian

Admin/Guru dapat membuat paket ujian dengan konfigurasi:

Nama ujian, mata pelajaran, kelas/kelompok
Tanggal & waktu mulai, tanggal & waktu berakhir
Durasi pengerjaan (menit)
Jumlah soal yang ditampilkan (bisa acak dari bank soal)
Urutan soal: tetap atau diacak per siswa
Pilihan jawaban diacak: ya/tidak
Bobot penilaian per soal



FR-005: Penjadwalan Ujian

Ujian hanya dapat diakses dalam rentang waktu yang ditentukan
Di luar rentang waktu, tombol "Mulai Ujian" tidak aktif
Status ujian: Belum Dimulai | Berlangsung | Selesai

6.3 Pelaksanaan Ujian (Exam Session)
FR-006: Autentikasi Siswa

Siswa login menggunakan NIS (Nomor Induk Siswa) + password
Setelah login, siswa hanya melihat ujian yang ditugaskan ke kelas mereka
Sesi ujian terikat ke akun siswa (tidak bisa dikerjakan di dua perangkat sekaligus)

FR-007: Timer Ujian

Timer countdown ditampilkan secara prominent di header halaman ujian
Timer bersumber dari server (bukan dari client) untuk mencegah manipulasi
Sinkronisasi ulang timer dilakukan setiap 30 detik ke server
Peringatan muncul saat waktu tersisa: 15 menit, 5 menit, 1 menit
Ketika waktu habis, ujian otomatis dikumpulkan dengan jawaban yang sudah diisi

FR-008: Navigasi Soal

Siswa dapat melihat daftar nomor soal di panel samping / bawah
Indikator visual per nomor: belum dijawab (kosong), sudah dijawab (terisi), ditandai (flag)
Siswa dapat melompat ke nomor soal tertentu
Siswa dapat menandai soal untuk ditinjau ulang

FR-009: Jawaban Pilihan Ganda

Tampilkan soal satu per satu atau semua sekaligus (konfigurasi per ujian)
Klik pilihan untuk memilih jawaban
Jawaban tersimpan otomatis ke Supabase setiap kali siswa memilih (auto-save)
Siswa dapat mengubah jawaban selama waktu masih ada

FR-010: Jawaban Essay

Textarea yang responsif untuk penulisan jawaban essay
Auto-save setiap 15 detik atau saat siswa berhenti mengetik (debounce 3 detik)
Batas karakter dapat dikonfigurasi per soal (opsional)
Guru dapat melihat jawaban essay dan memberikan nilai + komentar

FR-011: Submit Ujian

Tombol "Kumpulkan Ujian" tersedia setelah minimal 1 soal dijawab
Konfirmasi dialog muncul sebelum submit final: menampilkan jumlah soal terjawab vs belum terjawab
Setelah submit, siswa tidak dapat mengakses kembali soal ujian tersebut
Status sesi: in_progress → submitted

6.4 Anti-Kecurangan
FR-012: Deteksi Pindah Tab / Minimize Window

Menggunakan Page Visibility API (visibilitychange event)
Setiap kejadian tab switching atau window minimize dicatat sebagai violation_event:

Timestamp kejadian
Jumlah pelanggaran kumulatif


Siswa mendapat peringatan popup setiap kali pelanggaran terdeteksi: "Peringatan! Keluar dari halaman ujian telah dicatat."
Tidak ada batas maksimum — semua pelanggaran dicatat, bukan memblokir ujian
Jumlah pelanggaran ditampilkan kepada guru di laporan hasil ujian sebagai catatan integritas

FR-013: Fullscreen Mode (Opsional per Ujian)

Admin dapat mengaktifkan mode fullscreen wajib untuk ujian tertentu
Sistem request Fullscreen API saat ujian dimulai
Jika siswa keluar dari fullscreen, dicatat sebagai pelanggaran (sama seperti tab switching)

FR-014: Pencegahan Copy-Paste (Opsional)

Konfigurasi per ujian: disable klik kanan dan keyboard shortcut copy (Ctrl+C, Ctrl+A)
Untuk soal essay: mencatat jika ada paste event yang terdeteksi

FR-015: Satu Kali Pengerjaan

Database mencatat status per siswa per ujian (exam_sessions table)
Saat siswa mencoba membuka ujian yang sudah disubmit, sistem menampilkan halaman "Ujian sudah dikumpulkan" dengan nilai yang diperoleh
Tidak ada mekanisme reset dari sisi siswa; hanya Admin yang dapat mereset sesi ujian

6.5 Penilaian & Hasil
FR-016: Penilaian Otomatis Pilihan Ganda

Setelah submit, sistem langsung menghitung nilai pilihan ganda
Formula default: (Jumlah Benar / Total Soal PG) × Bobot PG
Konfigurasi nilai negatif tersedia (opsional): nilai dikurangi untuk jawaban salah

FR-017: Tampilan Nilai Langsung

Setelah submit, siswa langsung diarahkan ke halaman hasil yang menampilkan:

Nilai total (dari pilihan ganda yang sudah dihitung + essay pending jika ada)
Rincian per soal: jawaban siswa vs jawaban benar (untuk PG)
Persentase skor dan kategori kelulusan (Lulus / Tidak Lulus berdasarkan KKM)


Jika ada soal essay, nilai total ditampilkan setelah guru menilai

FR-018: Penilaian Essay oleh Guru

Guru mengakses dashboard penilaian essay per ujian
Tampil: nama siswa, jawaban essay, kolom input nilai, kolom komentar/feedback
Guru dapat menilai satu per satu atau batch
Nilai essay terintegrasi ke total nilai siswa secara otomatis setelah disimpan

FR-019: Laporan Hasil Ujian

Guru & Admin melihat laporan per ujian:

Tabel: nama siswa, nilai PG, nilai essay, total nilai, status lulus, jumlah pelanggaran
Grafik distribusi nilai (histogram)
Rata-rata kelas, nilai tertinggi, nilai terendah


Export laporan ke format .xlsx dan .pdf


7. Kebutuhan Non-Fungsional
7.1 Performa
MetrikTargetFirst Contentful Paint (FCP)< 1.5 detikTime to Interactive (TTI)< 3 detikAuto-save latency< 500msHalaman soal load time< 2 detikKapasitas concurrent users≥ 300 siswa bersamaan
7.2 Ketersediaan & Reliabilitas

Uptime: ≥ 99.5% (khususnya jam 07.00–16.00 WIB hari sekolah)
Auto-save ke Supabase mencegah kehilangan jawaban jika koneksi terputus sementara
Jawaban ter-cache di localStorage sebagai fallback offline sementara, disinkron saat koneksi pulih

7.3 Keamanan

Semua komunikasi menggunakan HTTPS/TLS
Supabase Row Level Security (RLS) aktif di semua tabel sensitif
JWT token dengan expiry 1 jam (refresh otomatis selama sesi aktif)
Soal ujian tidak dikirim ke client sebelum waktu ujian dimulai
API endpoint dilindungi; siswa tidak bisa query jawaban benar melalui API

7.4 Aksesibilitas & Kompatibilitas

Responsif untuk lebar layar mulai 360px (HP Android entry-level)
Mendukung browser: Chrome ≥ 90, Firefox ≥ 88, Safari ≥ 14, Samsung Internet ≥ 14
Font size minimal 16px untuk teks soal
Kontras warna memenuhi WCAG 2.1 AA

7.5 Skalabilitas

Arsitektur serverless (Vercel) auto-scale mengikuti traffic
Supabase connection pooling via PgBouncer diaktifkan
Soal dan gambar disimpan di Supabase Storage (CDN-backed)


8. Alur Pengguna (User Flow)
8.1 Alur Siswa
Login (NIS + Password)
      │
      ▼
Dashboard Siswa
  └── Daftar Ujian Tersedia
         │
         ├── [Belum waktunya] → Tampil countdown waktu mulai
         ├── [Sudah dikerjakan] → Tampil halaman hasil
         └── [Sedang berlangsung] ──────────────────────────┐
                                                             ▼
                                                   Halaman Instruksi Ujian
                                                   (durasi, jumlah soal, aturan)
                                                             │
                                                   Tombol "Mulai Ujian"
                                                             │
                                                             ▼
                                                   ┌─── Halaman Ujian ───┐
                                                   │  Timer (server-sync) │
                                                   │  Panel Navigasi Soal │
                                                   │  Area Soal & Jawaban │
                                                   │  Auto-save aktif     │
                                                   └──────────┬──────────┘
                                                              │
                                               ┌─────────────┴──────────────┐
                                         Waktu habis                   Klik "Kumpulkan"
                                         (auto-submit)                 + Konfirmasi Dialog
                                               └─────────────┬──────────────┘
                                                             ▼
                                                   Halaman Hasil Ujian
                                                   (nilai PG langsung,
                                                    essay pending/nilai)
8.2 Alur Guru — Buat Ujian
Login Guru
    │
    ▼
Dashboard Guru
    ├── Bank Soal
    │     ├── Buat soal manual (PG / Essay + LaTeX)
    │     └── Import dari Word (.docx) → Preview → Simpan
    │
    └── Paket Ujian
          ├── Buat Paket Ujian baru
          │     └── Pilih soal dari bank → Konfigurasi ujian → Jadwalkan
          └── Kelola Ujian Aktif
                └── Monitor sesi → Lihat log pelanggaran → Nilai essay
8.3 Alur Deteksi Pelanggaran
Siswa aktif di halaman ujian
         │
         ├── Tab di-switch / window minimize
         │         │
         │         ▼
         │   visibilitychange event fired
         │         │
         │         ▼
         │   POST /api/violations (catat ke DB)
         │         │
         │         ▼
         │   Popup peringatan ke siswa
         │   "Pelanggaran #N telah dicatat"
         │         │
         │         ▼
         │   Siswa kembali ke tab ujian → lanjut
         │
         └── Ujian selesai / submit
                   │
                   ▼
             Total pelanggaran tampil
             di laporan guru

9. Skema Database (Supabase)
Tabel Utama
sql-- Users (dikelola Supabase Auth, extended dengan profiles)
profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users,
  role          text CHECK (role IN ('admin', 'guru', 'siswa')),
  nama          text NOT NULL,
  nis           text UNIQUE,              -- untuk siswa
  nip           text UNIQUE,              -- untuk guru
  kelas         text,                     -- untuk siswa
  mata_pelajaran text[],                  -- untuk guru
  created_at    timestamptz DEFAULT now()
)

-- Bank Soal
questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guru_id       uuid REFERENCES profiles(id),
  mata_pelajaran text NOT NULL,
  kelas         text,
  tipe          text CHECK (tipe IN ('pilihan_ganda', 'essay')),
  konten        text NOT NULL,           -- teks soal, bisa berisi LaTeX
  pilihan       jsonb,                   -- [{key: 'A', teks: '...'}, ...]
  jawaban_benar text,                    -- key pilihan yang benar (untuk PG)
  bobot         int DEFAULT 1,
  tingkat       text CHECK (tingkat IN ('mudah', 'sedang', 'sulit')),
  created_at    timestamptz DEFAULT now()
)

-- Paket Ujian
exams (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama          text NOT NULL,
  mata_pelajaran text NOT NULL,
  kelas         text[] NOT NULL,         -- kelas yang boleh mengakses
  guru_id       uuid REFERENCES profiles(id),
  waktu_mulai   timestamptz NOT NULL,
  waktu_selesai timestamptz NOT NULL,
  durasi_menit  int NOT NULL,
  acak_soal     boolean DEFAULT false,
  acak_pilihan  boolean DEFAULT false,
  kkm           int DEFAULT 75,         -- nilai minimum lulus
  config        jsonb,                  -- konfigurasi tambahan (fullscreen, dll)
  status        text DEFAULT 'draft',   -- draft | published | archived
  created_at    timestamptz DEFAULT now()
)

-- Soal dalam Paket Ujian
exam_questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id       uuid REFERENCES exams(id) ON DELETE CASCADE,
  question_id   uuid REFERENCES questions(id),
  urutan        int,
  bobot_override int                    -- override bobot dari bank soal
)

-- Sesi Ujian Siswa
exam_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id       uuid REFERENCES exams(id),
  siswa_id      uuid REFERENCES profiles(id),
  started_at    timestamptz,
  submitted_at  timestamptz,
  status        text DEFAULT 'not_started', -- not_started | in_progress | submitted
  nilai_pg      numeric(5,2),
  nilai_essay   numeric(5,2),
  nilai_total   numeric(5,2),
  jumlah_pelanggaran int DEFAULT 0,
  UNIQUE(exam_id, siswa_id)
)

-- Jawaban Siswa
answers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id   uuid REFERENCES questions(id),
  jawaban       text,                   -- key pilihan (PG) atau teks (essay)
  nilai_essay   numeric(5,2),           -- diisi guru untuk essay
  feedback_guru text,
  saved_at      timestamptz DEFAULT now()
)

-- Log Pelanggaran
violation_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid REFERENCES exam_sessions(id) ON DELETE CASCADE,
  tipe          text,                   -- tab_switch | fullscreen_exit | paste
  timestamp     timestamptz DEFAULT now()
)
Row Level Security (RLS) — Ringkasan
TabelSiswaGuruAdminquestionsBaca soal ujian aktif sajaCRUD milik sendiriFullexamsBaca ujian yang dijadwalkan untuk kelas merekaCRUD milik sendiriFullexam_sessionsBaca/Update milik sendiriBaca sesi ujian merekaFullanswersCRUD milik sendiriBaca + update nilai_essayFullviolation_logsInsert sajaBacaFull

10. Desain UI/UX
10.1 Prinsip Desain

Mobile-first: Layout dirancang untuk layar 360px, lalu di-scale ke desktop
Fokus & Minim Distraksi: Saat ujian berlangsung, UI seminimal mungkin
Feedback Instan: Setiap aksi (simpan jawaban, pelanggaran) memberikan feedback visual

10.2 Halaman Utama
HalamanDeskripsi/loginForm login NIS/email + password/dashboardDashboard berdasarkan role (siswa / guru / admin)/ujian/[id]Halaman instruksi ujian/ujian/[id]/soalHalaman pengerjaan ujian (mode kunci penuh)/ujian/[id]/hasilHalaman hasil setelah submit/guru/bank-soalManajemen bank soal/guru/ujianManajemen paket ujian/guru/penilaian/[id]Halaman penilaian essay/adminDashboard admin (user management, laporan)
10.3 Komponen Kritis
Timer Component

Posisi: sticky di header, selalu terlihat
Warna berubah: hitam → kuning (15 mnt) → merah (5 mnt)
Berkedip saat 1 menit terakhir

Violation Banner

Muncul di atas halaman ujian setiap kali pelanggaran dicatat
Dismissable setelah 5 detik
Menampilkan total pelanggaran kumulatif

Math Renderer

Soal dengan LaTeX dirender menggunakan KaTeX
Loading state saat rendering
Fallback teks jika rendering gagal


11. Keamanan & Integritas Ujian
11.1 Proteksi Soal

Soal tidak dikirim ke browser sebelum siswa memulai ujian
API soal hanya bisa diakses jika exam_session.status = 'in_progress'
Jawaban benar tidak pernah dikirim ke client (hanya diproses di server/database)

11.2 Validasi Server-Side

Semua submit jawaban divalidasi di server (waktu masih dalam durasi, sesi masih aktif)
Timer canonical ada di server; manipulasi client-side tidak berpengaruh
Duplikasi submit (replay attack) dicegah via idempotency key per sesi

11.3 Monitoring Pelanggaran

Setiap violation_event disimpan dengan timestamp akurat (server time)
Log tidak bisa dihapus oleh siswa (RLS: siswa hanya bisa INSERT)
Guru dan admin bisa melihat timeline lengkap pelanggaran


12. Milestone & Prioritas
Phase 1 — MVP (8 Minggu)
Prioritas: Must Have
#FiturEstimasi1Auth (login siswa, guru, admin)1 minggu2Bank soal manual (PG & essay)1 minggu3Buat & jadwalkan paket ujian1 minggu4Halaman ujian + timer + auto-save2 minggu5Deteksi pelanggaran tab switching0.5 minggu6Penilaian otomatis PG + tampil hasil1 minggu7Penilaian essay manual oleh guru0.5 minggu8Deploy ke Vercel + Supabase1 minggu
Phase 2 — Enhancement (4 Minggu)
Prioritas: Should Have
#FiturEstimasi1Import soal dari Word (.docx)1.5 minggu2Dukungan rumus matematika (KaTeX)1 minggu3Export laporan ke Excel/PDF1 minggu4Fullscreen mode enforcement0.5 minggu
Phase 3 — Advanced (Backlog)
Prioritas: Nice to Have

Analitik soal (tingkat kesulitan aktual, daya beda)
Randomisasi soal berbeda per siswa
Notifikasi email/WA saat ujian akan dimulai
Proctoring via webcam (future consideration)
Mobile app (PWA)