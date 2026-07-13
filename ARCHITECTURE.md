# Arsitektur

## Komponen

- `src/app`: App Router, halaman role-based, Route Handlers upload/CSV/admin.
- `src/components`: kamera, form presensi/stok, navigasi, dan verifikasi.
- `src/lib`: Supabase SSR/browser/admin, validasi Zod, foto Sharp, domain/format.
- `supabase/migrations`: schema, trigger, fungsi sensitif, RLS, storage policy.
- `supabase/seed.sql`: booth, shift, item stok, dan checklist awal.

Auth memakai cookie SSR PKCE melalui `@supabase/ssr`; `proxy.ts` menyegarkan session dan memberi `private, no-store`. Halaman terautentikasi selalu dinamis untuk mencegah cache lintas pengguna.

## Alur presensi

1. Client mengambil kamera dan geolocation, lalu mengirim multipart.
2. Route memvalidasi session dengan `auth.getUser()`, mengambil profile/jadwal/booth dari RLS, membersihkan dan mengompresi foto.
3. Route membuat watermark dari identitas database, booth, aktivitas, waktu server, dan lokasi; SHA-256 dihitung pada file original-terkompresi.
4. Server mengunggah ke bucket private dengan path UUID dan `upsert:false`.
5. RPC `record_check_in`/`record_check_out` memakai `auth.uid()` serta `now()` database, mengunci record, menghitung WIB, keterlambatan, Haversine, status, idempotency, dan audit.
6. Jika RPC gagal, object yang baru diunggah dihapus.

## Alur stok

Route memvalidasi assignment melalui RLS, menyimpan header/detail dengan timestamp database, lalu memproses hingga lima foto. Bila tahap parsial gagal, route service menghapus object dan record turunannya agar retry aman. Worker tidak memiliki policy update/delete.

## Keputusan

Sharp dipilih karena decoder matang, resize/rotate, EXIF stripping, WebP, dan SVG compositing server-side. Tidak ada base64 di database. PostGIS tidak diperlukan untuk MVP; fungsi Haversine PostgreSQL dan TypeScript diuji. Server Components digunakan untuk query dashboard agar bundle client kecil.

## Risiko

GPS/browser dapat dimanipulasi; service key compromise berdampak tinggi; free tier dapat pause; dua versi foto menghabiskan storage cepat; upload besar pada jaringan lemah dapat timeout. Mitigasi dijelaskan di SECURITY dan README.
