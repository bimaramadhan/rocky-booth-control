# Rocky Booth Control

Rocky Booth Control adalah aplikasi operasional booth berbasis Next.js 16, TypeScript, Tailwind CSS, dan Supabase. Pekerja dapat presensi masuk/pulang dengan kamera dan lokasi, mengirim pemeriksaan stok multi-foto, serta melihat riwayat sendiri. Admin dapat memantau, memverifikasi, mengelola master data, membaca audit trail, dan mengekspor CSV.

## Status implementasi

MVP dapat di-install dan production build berhasil. Integrasi riil memerlukan project Supabase milik Anda; tidak ada database atau kredensial palsu dalam alur produksi. Timestamp sensitif dibuat dengan `now()` PostgreSQL atau default `timestamptz`, bukan jam HP. Foto dibersihkan EXIF, dikompresi WebP, di-hash SHA-256 dan diberi watermark oleh route server sebelum masuk private bucket.

## Arsitektur singkat

Browser/PWA → Next.js Server Components dan Route Handlers → Supabase Auth/Postgres/Private Storage. Browser memakai publishable key dengan RLS; secret key hanya di server untuk administrasi Auth, upload private storage, signed URL, dan rollback kegagalan parsial. Lihat [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE.md](DATABASE.md), dan [SECURITY.md](SECURITY.md).

## Persyaratan

- Node.js 24 LTS (project mengunci `>=24 <25`)
- pnpm 11+
- Supabase CLI terbaru atau akses SQL Editor
- Project Supabase Free

## Instalasi lokal

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Buka `http://localhost:3000`. Isi env terlebih dahulu agar login dan halaman terautentikasi berfungsi.

## Setup Supabase

1. Buat project di dashboard Supabase tanpa memasukkan secret ke repository.
2. Jalankan `supabase link --project-ref PROJECT_ID`, lalu `supabase db push`; alternatifnya tempel berurutan isi `supabase/migrations/*.sql` di SQL Editor.
3. Jalankan `supabase/seed.sql`. Migration sudah membuat empat bucket private beserta policy: `attendance-originals`, `attendance-watermarked`, `stock-originals`, `stock-watermarked`.
4. Di Authentication → URL Configuration, isi Site URL dan redirect URL `https://DOMAIN/auth/callback`.
5. Buat akun demo/admin dengan prosedur di bawah.

RLS aktif pada seluruh tabel operasional. Jangan membuat bucket menjadi public dan jangan memberi policy insert langsung ke browser.

## Environment variables

| Nama | Scope | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server | Publishable/anon key; aman diekspos bila RLS benar |
| `SUPABASE_SECRET_KEY` | server saja | Secret/service role untuk Auth admin dan Storage |
| `NEXT_PUBLIC_APP_URL` | browser + server | Origin aplikasi |
| `MAX_PHOTO_BYTES` | server | Batas upload mentah, default 8 MiB |
| `RATE_LIMIT_SECONDS` | server | Cadangan konfigurasi throttling; constraint/idempotency tetap utama |
| `PHOTO_RETENTION_DAYS` | server | `0` berarti penghapusan otomatis nonaktif |
| `DEMO_*` | script saja | Email/password sementara untuk setup akun demo |

## Akun demo dan admin pertama

Jangan simpan password di git. Setelah migration dan seed, set env pada terminal lalu jalankan:

```bash
pnpm exec dotenv -e .env.local -- node scripts/create-demo-users.mjs
```

Jika `dotenv-cli` tidak dipasang, ekspor env di shell lalu `node scripts/create-demo-users.mjs`. Script membuat satu admin dan satu pekerja, serta assignment booth. Buat jadwal hari ini dari Admin → Pekerja & jadwal. Admin selanjutnya dapat menambah pekerja dari UI.

## Koordinat booth

Di ponsel, buka Google Maps/OpenStreetMap, tekan lama titik booth, lalu salin pasangan latitude dan longitude. Masukkan nilai desimal apa adanya di Admin → Booth. Verifikasi titik dan mulai dengan radius 150 m; gedung/kanopi dapat menurunkan akurasi GPS.

## Perintah verifikasi

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Test database setelah local Supabase aktif:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_and_constraints.sql
```

## Deployment

Jalur gratis yang direkomendasikan untuk usaha adalah Netlify Free karena dokumentasi paketnya tidak membatasi Free hanya untuk personal dan memberikan 300 kredit/bulan; project akan dipause bila kredit habis. Import repository, build `pnpm build`, lalu isi seluruh env. Netlify mendeteksi Next.js otomatis. Vercel secara teknis paling sederhana tetapi Hobby dinyatakan untuk personal/non-komersial, sehingga booth komersial harus memakai paket yang sesuai. Detail lengkap ada di [DEPLOYMENT.md](DEPLOYMENT.md).

## Kapasitas dan paket gratis (diverifikasi 13-07-2026)

Supabase Free mendokumentasikan 500 MB database, 1 GB file storage, 5 GB egress, 50.000 MAU, dua project aktif, dan pause setelah tujuh hari tidak aktif. Sumber: [Supabase Pricing](https://supabase.com/pricing). Netlify Free mendokumentasikan 300 kredit/bulan. Sumber: [Netlify Pricing](https://www.netlify.com/pricing/). Vercel Hobby $0 dibatasi personal/non-komersial. Sumber: [Vercel Pricing](https://vercel.com/pricing).

Rumus storage per bulan:

`pekerja × foto/hari × ukuran rata-rata × hari kerja`

Contoh: `1 × 4 × 750 KB × 26 = 78.000 KB ≈ 76,2 MiB/bulan`. Karena aplikasi menyimpan original-terkompresi dan watermarked, anggarkan hingga sekitar dua kali nilai tersebut. Dengan retensi `R` bulan: `storage total ≈ storage bulanan × R`. Pada kuota 1 GB, contoh dua versi foto dapat mencapai batas kira-kira dalam 6–7 bulan, belum termasuk overhead; pantau dashboard, jangan mengandalkan estimasi saja.

## Backup dan migrasi kapasitas

- Free tidak menyediakan backup otomatis. Lakukan `supabase db dump` berkala ke lokasi terenkripsi dan ekspor bucket dengan script admin yang terkontrol.
- Uji restore secara berkala, bukan hanya membuat dump.
- Saat mendekati 70–80% storage, pendekkan retensi setelah persetujuan bisnis, arsipkan ke object storage lain, atau pindah Supabase Pro/self-hosted.
- Jangan aktifkan penghapusan otomatis sebelum backup dan kebijakan retensi disetujui.

## Batasan anti-kecurangan

Aplikasi web tidak dapat menjamin anti-kecurangan 100%. Browser tertentu tetap dapat menawarkan galeri meskipun `capture="environment"`; GPS dapat ditolak atau dipalsukan pada perangkat yang dikompromikan; waktu resmi adalah waktu server menerima upload sehingga koneksi buruk menggeser waktu aktivitas. Sistem mengurangi manipulasi melalui server timestamp, Auth/RLS, direct camera preference, geolocation + accuracy + Haversine, hash, watermark server, private storage, immutable worker records, idempotency, dan audit log.

## Koneksi lemah

PWA menyimpan shell halaman publik agar dapat dibuka. Aplikasi tidak pernah menampilkan sukses sebelum konfirmasi server. Foto tetap berada di form dan tombol dapat ditekan ulang jika kiriman gagal; gunakan idempotency pada request. Draft yang belum sukses bukan presensi resmi dan waktu resmi baru dibuat saat server menerima data. Jangan membersihkan data browser sebelum retry.

## Troubleshooting

- `schedule_not_found`: admin perlu membuat jadwal untuk tanggal hari ini.
- Kamera/lokasi tidak muncul: gunakan HTTPS atau localhost dan cek izin browser.
- Upload ditolak: pastikan MIME JPEG/PNG/WebP, ukuran di bawah `MAX_PHOTO_BYTES`, dan bucket private tersedia.
- `new row violates row-level security`: cek assignment aktif, jadwal, tanggal WIB, serta profile Auth.
- Project Supabase pause: buka dashboard untuk mengaktifkan kembali lalu pertimbangkan aktivitas/upgrade yang sesuai.
- Foto tidak tampil: cek secret key hanya di host server dan path private bucket; signed URL berlaku singkat.

Panduan pengguna: [USER_GUIDE_ADMIN.md](USER_GUIDE_ADMIN.md) dan [USER_GUIDE_EMPLOYEE.md](USER_GUIDE_EMPLOYEE.md).
