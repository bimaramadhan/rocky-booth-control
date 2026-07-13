# Keamanan

## Trust boundary

Client hanya dipercaya untuk menyediakan file foto dan pembacaan lokasi yang kemudian diberi status/akurasi. Nama, role, booth, jadwal, tanggal, dan waktu tidak dipercaya dari request. Session diverifikasi dengan `auth.getUser()`, data identitas dibaca dari database, dan operasi presensi diselesaikan oleh fungsi PostgreSQL menggunakan `auth.uid()` serta `now()`.

## Kontrol

- RLS aktif pada semua tabel operasional; UI role bukan boundary keamanan.
- Secret Supabase hanya di server (`server-only`) dan tidak memiliki prefix `NEXT_PUBLIC_`.
- Bucket private, nama file UUID, `upsert:false`, signed URL singkat.
- MIME whitelist, batas request, decode gambar nyata oleh Sharp, EXIF dibuang, hasil WebP maksimal 1600 px.
- SHA-256 untuk audit, watermark di server, input Zod, catatan dibatasi panjangnya.
- CSP, frame deny, nosniff, referrer policy, camera/geolocation permissions policy.
- Unique/idempotency constraints dan row lock mencegah double submit/check-out balapan.
- CSV menambahkan apostrof pada nilai awal `=`, `+`, `-`, `@` dan meng-escape quote.
- Audit/verification log tidak memiliki policy worker update/delete.
- User agent dipotong 300 karakter; tidak ada fingerprint invasif.

## Operasional

Rotasi secret key bila bocor, aktifkan MFA admin Supabase, gunakan HTTPS, tinjau audit log, batasi anggota project, dan jangan menyalin production dump ke perangkat tidak terenkripsi. Secret deployment harus ditandai sensitive. Jangan merekam isi password atau payload foto dalam log.

## Residual risk

Perangkat rooted, GPS spoofing, foto layar lain, berbagi akun, dan manipulasi di luar aplikasi tidak dapat ditiadakan oleh web app. Pertimbangkan pelatihan, inspeksi acak, MFA, device attestation native app, dan pembandingan visual bila risiko usaha meningkat.
