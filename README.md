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
2. Jalankan `supabase link --project-ref PROJECT_ID`, lalu `supabase db push`; alternatifnya tempel berurutan `202607130001_initial.sql` lalu `202607140001_single_booth_workflow.sql` di SQL Editor.
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

Jika `dotenv-cli` tidak dipasang, ekspor env di shell lalu `node scripts/create-demo-users.mjs`. Script membuat satu admin dan satu pekerja beserta assignment booth. Jadwal harian tidak wajib pada mode satu booth; shift aktif pertama dipakai otomatis, dan migration membuat Shift Utama bila belum ada. Admin selanjutnya dapat menambah pekerja dari UI.

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

- `BOOTH_NOT_CONFIGURED`: pastikan tepat satu booth aktif tersedia dan koordinat booth sudah diisi.
- Kamera/lokasi tidak muncul: gunakan HTTPS atau localhost dan cek izin browser.
- Upload ditolak: pastikan MIME JPEG/PNG/WebP, bucket private tersedia, dan secret server benar. Browser mengompres foto sebelum mengirim agar tiga foto stok tetap aman terhadap batas request host.
- `new row violates row-level security`: jalankan migration terbaru, cek profile pekerja aktif, satu booth aktif/assignment, dan tanggal WIB.
- Project Supabase pause: buka dashboard untuk mengaktifkan kembali lalu pertimbangkan aktivitas/upgrade yang sesuai.
- Foto tidak tampil: cek secret key hanya di host server dan path private bucket; signed URL berlaku singkat.

Panduan pengguna: [USER_GUIDE_ADMIN.md](USER_GUIDE_ADMIN.md) dan [USER_GUIDE_EMPLOYEE.md](USER_GUIDE_EMPLOYEE.md).

## Alur operasional satu booth

- Pekerja membuka Beranda dan hanya melihat satu aksi yang relevan: Presensi Masuk → Cek Stok → Presensi Pulang.
- Presensi memakai kamera depan; stok memakai kamera belakang dan wajib tepat tiga kategori foto.
- Cek stok tidak memerlukan schedule. Pekerja hanya mengisi jumlah fisik dan catatan opsional melalui wizard lima langkah.
- Satu laporan stok final diizinkan per pekerja/booth/tanggal. Admin dapat menandai laporan valid, perlu diperiksa, ditolak, atau membuka ulang laporan dengan konfirmasi agar pekerja dapat mengirim ulang.
- Admin melihat jam masuk/pulang, status stok, foto ber-watermark, riwayat, serta dapat mengubah booth, pekerja, dan item stok.

## Konfigurasi satu booth dan item stok

1. Login sebagai admin, buka **Booth**, dan pastikan hanya satu record berstatus aktif. Isi nama, alamat, latitude, longitude, dan radius presensi.
2. Buka **Pekerja** untuk membuat satu akun pekerja. Password awal minimal delapan karakter dan harus diberikan secara privat.
3. Buka **Master stok**, tambahkan nama item, satuan, dan stok minimum. Item baru otomatis ditautkan ke semua booth aktif.
4. `supabase/seed.sql` menyediakan contoh booth, item, dan checklist. Sesuaikan semua contoh sebelum produksi.

## Storage dan RLS

Migration membuat empat bucket private: `attendance-originals`, `attendance-watermarked`, `stock-originals`, dan `stock-watermarked`. Browser tidak memiliki policy upload langsung; route server memvalidasi sesi, menentukan `user_id` dari sesi, memproses Sharp pada Node.js runtime, mengunggah dengan service role, lalu memverifikasi file sebelum menyatakan sukses. Admin dan pemilik file membuka foto melalui signed URL berumur 60 detik.

RLS membatasi pekerja pada profile dan record miliknya. Helper `can_use_active_booth` mengizinkan pekerja aktif memakai satu-satunya booth aktif tanpa schedule; bila lebih dari satu booth aktif, assignment tetap diperlukan. Pekerja tidak memiliki policy untuk mengubah role, attendance final, stock check final, verifikasi, atau audit log.

## Debugging upload foto

Error `Unexpected token 'I', "Internal S" is not valid JSON` sebelumnya terjadi saat frontend memanggil `response.json()` terhadap halaman/plain text `Internal Server Error`. Sekarang semua route upload membungkus proses dalam `try-catch` dan memakai envelope JSON seragam; helper browser lebih dulu memeriksa `content-type`, sehingga UI tidak crash dan preview tetap tersedia untuk retry.

Jika upload masih gagal:

1. Buka Netlify **Logs → Functions** dan cari `ATTENDANCE_PHOTO_UPLOAD_FAILED` atau `STOCK_PHOTO_UPLOAD_FAILED`. Log tidak berisi token atau foto.
2. Cocokkan `NEXT_PUBLIC_SUPABASE_URL`, publishable key, dan `SUPABASE_SECRET_KEY` dengan project yang sama. Jangan memakai placeholder `project_id.supabase.co`.
3. Di Supabase Storage, pastikan keempat bucket ada, private, dan nama persis sama.
4. Di SQL Editor, pastikan kedua migration berhasil dan profile Auth memiliki row `profiles` aktif.
5. Periksa Network browser: route harus mengembalikan JSON pada kegagalan. Status 413 dari host berarti request terlalu besar; pastikan versi terbaru dengan kompresi browser sudah terdeploy.

## Deploy ulang dan smoke test

Push commit ke branch yang dipantau Netlify atau tekan **Deploys → Trigger deploy → Clear cache and deploy site**. Setelah sukses, pastikan environment production lengkap, ubah `NEXT_PUBLIC_APP_URL`, lalu tambahkan domain HTTPS di Supabase Authentication URL Configuration.

Smoke test dari ponsel nyata:

1. Login pekerja, izinkan kamera/lokasi, presensi masuk, lalu pastikan dashboard berubah dan foto tampil di detail admin.
2. Tanpa membuat schedule, selesaikan wizard stok, ambil tiga foto, dan pastikan detail, checklist, foto, serta timestamp tampil pada admin.
3. Presensi pulang dan pastikan record presensi yang sama mendapat jam pulang dan durasi.
4. Matikan koneksi saat form berisi foto; pastikan pesan manusiawi dan tombol Coba Lagi muncul tanpa menghapus preview.
5. Coba file MIME salah/API non-JSON pada lingkungan test; UI tidak boleh crash.
6. Pastikan pekerja tidak dapat membuka URL foto user lain atau halaman `/admin`.
