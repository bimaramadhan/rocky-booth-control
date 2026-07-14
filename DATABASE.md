# Database

Migration utama: `supabase/migrations/202607130001_initial.sql`, dilanjutkan `supabase/migrations/202607140001_single_booth_workflow.sql`.

Tabel: `profiles`, `booths`, `employee_booth_assignments`, `shifts`, `employee_schedules`, `attendances`, `stock_items`, `booth_stock_items`, `stock_checks`, `stock_check_details`, `stock_check_photos`, `booth_checklists`, `verification_logs`, dan `audit_logs`.

Semua PK operasional UUID kecuali audit sequence. Timestamp memakai `timestamptz`; tanggal bisnis dihitung di Asia/Jakarta. Unique constraint mencegah attendance ganda per pekerja/booth/tanggal/shift dan stock check ganda harian. Check-out harus sesudah check-in. Index disediakan untuk tanggal/booth/verifikasi/assignment.

Fungsi sensitif `record_check_in`, `record_check_out`, dan `verify_record` adalah `security definer` dengan `search_path=''`, tetap mengambil pelaku dari `auth.uid()`. `is_admin`, `assigned_to`, dan `can_use_active_booth` menjadi helper RLS. Jika tepat satu booth aktif tersedia, pekerja aktif dapat memakai booth itu tanpa schedule; jika lebih dari satu booth, assignment kembali diwajibkan. Worker tidak memperoleh policy update/delete untuk attendance, stock check, foto, verification, atau audit.

Empat bucket dibuat private. Browser tidak mendapat policy insert storage; route server yang terautentikasi mengunggah dengan `upsert:false`. Admin/owner mengakses versi watermark melalui route signed URL 60 detik.

Migration: `supabase db push`. Reset lokal: `supabase db reset`. Seed: `supabase db reset` otomatis membaca `supabase/seed.sql`, atau jalankan manual. Test metadata RLS: `psql ... -f supabase/tests/rls_and_constraints.sql`.
