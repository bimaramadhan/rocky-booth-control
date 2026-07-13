-- Jalankan setelah `supabase db reset`: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_and_constraints.sql
begin;
do $$begin
  if not exists(select 1 from pg_indexes where schemaname='public' and indexname='attendance_checkout_idempotency_idx') then raise exception 'idempotency index hilang'; end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='attendances' and policyname='attendance_read') then raise exception 'RLS attendance hilang'; end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='profiles' and cmd='UPDATE' and qual not like '%is_admin%') then raise exception 'pekerja berpotensi mengubah role'; end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='audit_logs' and cmd in('UPDATE','DELETE','ALL')) then raise exception 'audit log mutable'; end if;
  if exists(select 1 from storage.buckets where id like '%watermarked' and public) then raise exception 'bucket foto publik'; end if;
end$$;
rollback;
