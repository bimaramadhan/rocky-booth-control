# Panduan Admin

1. Masuk di `/login`; dashboard menunjukkan ringkasan hari berjalan dalam WIB.
2. Di **Booth**, tambahkan nama, alamat, koordinat desimal, dan radius. Verifikasi titik sebelum dipakai.
3. Di **Shift**, buat jam masuk/pulang dan toleransi.
4. Di **Pekerja**, buat akun dengan password awal kuat, pilih booth, lalu buat jadwal tanggal/shift. Minta pekerja mengganti password melalui alur reset.
5. Di **Item stok**, tambahkan master dan minimum; item baru dikaitkan ke semua booth aktif.
6. Buka **Presensi** atau **Cek stok**, filter tanggal, lalu detail untuk melihat watermark, waktu server, GPS, jarak, akurasi, hash, dan rincian.
7. Pilih Valid, Perlu diperiksa, atau Ditolak dan isi catatan. Rekaman asli tidak berubah; tindakan masuk verification/audit log.
8. **Laporan** mengunduh CSV UTF-8 untuk Excel. **Audit log** menampilkan tindakan terbaru.

Jika seorang pekerja belum tercatat, periksa jadwal, assignment, koneksi, dan audit. Jangan meminta pekerja mengirim tanggal palsu; kiriman terlambat tetap memakai waktu penerimaan server.
