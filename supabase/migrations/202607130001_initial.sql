begin;
create extension if not exists pgcrypto;

create type public.user_role as enum ('admin','employee');
create type public.verification_status as enum ('pending','needs_review','verified','rejected');
create type public.attendance_status as enum ('on_time','late','outside_radius','location_unavailable','incomplete');
create type public.stock_status as enum ('safe','low','empty','discrepancy','needs_review');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null check (char_length(full_name) between 2 and 100),
  email text not null,
  role public.user_role not null default 'employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create unique index profiles_email_key on public.profiles(lower(email)) where deleted_at is null;

create table public.booths (
  id uuid primary key default gen_random_uuid(), name text not null,
  address text not null default '', timezone text not null default 'Asia/Jakarta',
  latitude numeric(9,6), longitude numeric(9,6), attendance_radius_m integer not null default 150 check(attendance_radius_m between 10 and 5000),
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);
create table public.employee_booth_assignments (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.profiles(id), booth_id uuid not null references public.booths(id),
  starts_on date not null default current_date, ends_on date, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(employee_id,booth_id,starts_on), check(ends_on is null or ends_on>=starts_on)
);
create index assignments_employee_active_idx on public.employee_booth_assignments(employee_id,is_active);

create table public.shifts (
  id uuid primary key default gen_random_uuid(), booth_id uuid not null references public.booths(id), name text not null,
  start_time time not null, end_time time not null, late_tolerance_minutes integer not null default 10 check(late_tolerance_minutes between 0 and 180),
  active_days smallint[] not null default '{1,2,3,4,5,6,7}', is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(booth_id,name)
);
create table public.employee_schedules (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.profiles(id), booth_id uuid not null references public.booths(id), shift_id uuid not null references public.shifts(id),
  work_date date not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(employee_id,work_date)
);
create index schedules_date_booth_idx on public.employee_schedules(work_date,booth_id);

create table public.attendances (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), booth_id uuid not null references public.booths(id), shift_id uuid not null references public.shifts(id),
  attendance_date date not null, check_in_at timestamptz not null default now(), check_out_at timestamptz,
  check_in_original_path text not null, check_in_watermarked_path text not null, check_in_photo_hash text not null check(check_in_photo_hash~'^[a-f0-9]{64}$'),
  check_in_latitude numeric(9,6), check_in_longitude numeric(9,6), check_in_accuracy_m numeric(9,2), check_in_distance_m numeric(10,2),
  check_out_original_path text, check_out_watermarked_path text, check_out_photo_hash text,
  check_out_latitude numeric(9,6), check_out_longitude numeric(9,6), check_out_accuracy_m numeric(9,2), check_out_distance_m numeric(10,2),
  work_duration_minutes integer, late_minutes integer not null default 0,
  status public.attendance_status not null default 'incomplete', verification_status public.verification_status not null default 'pending', admin_note text check(char_length(admin_note)<=1000),
  device_info text check(char_length(device_info)<=300), check_in_idempotency_key text not null, check_out_idempotency_key text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,booth_id,attendance_date,shift_id), unique(user_id,check_in_idempotency_key),
  check(check_out_at is null or check_out_at>check_in_at), check(check_out_photo_hash is null or check_out_photo_hash~'^[a-f0-9]{64}$')
);
create unique index attendance_checkout_idempotency_idx on public.attendances(user_id,check_out_idempotency_key) where check_out_idempotency_key is not null;
create index attendance_date_booth_idx on public.attendances(attendance_date,booth_id);
create index attendance_verify_idx on public.attendances(verification_status,attendance_date);

create table public.stock_items (
  id uuid primary key default gen_random_uuid(), name text not null, unit text not null, default_minimum numeric(12,2) not null default 0,
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(name,unit)
);
create table public.booth_stock_items (
  id uuid primary key default gen_random_uuid(), booth_id uuid not null references public.booths(id), stock_item_id uuid not null references public.stock_items(id), minimum_stock numeric(12,2) not null default 0,
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(booth_id,stock_item_id)
);
create table public.stock_checks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), booth_id uuid not null references public.booths(id), check_date date not null,
  checked_at timestamptz not null default now(), latitude numeric(9,6), longitude numeric(9,6), accuracy_m numeric(9,2), distance_m numeric(10,2), location_status text not null check(location_status in('within_radius','outside_radius','location_unavailable')),
  worker_note text check(char_length(worker_note)<=1000), checklist jsonb not null default '{}', verification_status public.verification_status not null default 'pending', admin_note text check(char_length(admin_note)<=1000),
  idempotency_key text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,booth_id,check_date), unique(user_id,idempotency_key)
);
create index stock_checks_date_booth_idx on public.stock_checks(check_date,booth_id);
create table public.stock_check_details (
  id uuid primary key default gen_random_uuid(), stock_check_id uuid not null references public.stock_checks(id) on delete restrict, stock_item_id uuid not null references public.stock_items(id),
  opening_qty numeric(12,2) not null default 0, incoming_qty numeric(12,2) not null default 0, usage_qty numeric(12,2) not null default 0, physical_qty numeric(12,2) not null,
  expected_qty numeric(12,2) generated always as (opening_qty+incoming_qty-usage_qty) stored,
  minimum_stock numeric(12,2) not null default 0, status public.stock_status not null, worker_note text check(char_length(worker_note)<=500), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(stock_check_id,stock_item_id), check(opening_qty>=0 and incoming_qty>=0 and usage_qty>=0 and physical_qty>=0)
);
create table public.stock_check_photos (
  id uuid primary key default gen_random_uuid(), stock_check_id uuid not null references public.stock_checks(id) on delete restrict,
  category text not null check(char_length(category)<=80), original_path text not null unique, watermarked_path text not null unique, photo_hash text not null check(photo_hash~'^[a-f0-9]{64}$'),
  captured_at timestamptz not null default now(), latitude numeric(9,6), longitude numeric(9,6), accuracy_m numeric(9,2), metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.booth_checklists (
  id uuid primary key default gen_random_uuid(), booth_id uuid not null references public.booths(id), label text not null, sort_order integer not null default 0, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(booth_id,label)
);
create table public.verification_logs (
  id uuid primary key default gen_random_uuid(), record_type text not null check(record_type in('attendance','stock_check')), record_id uuid not null,
  previous_status public.verification_status not null, new_status public.verification_status not null, note text check(char_length(note)<=1000), admin_id uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create index verification_record_idx on public.verification_logs(record_type,record_id,created_at);
create table public.audit_logs (
  id bigint generated always as identity primary key, actor_id uuid references public.profiles(id), action text not null, entity_type text not null, entity_id text, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create index audit_created_idx on public.audit_logs(created_at desc);

create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
do $$declare t text;begin foreach t in array array['profiles','booths','employee_booth_assignments','shifts','employee_schedules','attendances','stock_items','booth_stock_items','stock_checks','stock_check_details','booth_checklists'] loop execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t);end loop;end$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and is_active)$$;
create function public.assigned_to(p_user uuid,p_booth uuid,p_date date default current_date) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.employee_booth_assignments where employee_id=p_user and booth_id=p_booth and is_active and starts_on<=p_date and (ends_on is null or ends_on>=p_date))$$;
create function public.distance_m(lat1 numeric,lon1 numeric,lat2 numeric,lon2 numeric) returns numeric language sql immutable as $$select 6371000*2*asin(sqrt(power(sin(radians((lat2-lat1)/2)),2)+cos(radians(lat1))*cos(radians(lat2))*power(sin(radians((lon2-lon1)/2)),2)))$$;

create function public.record_check_in(p_original_path text,p_watermarked_path text,p_hash text,p_lat numeric,p_lon numeric,p_accuracy numeric,p_device text,p_idempotency text)
returns public.attendances language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); n timestamptz:=now(); d date; sched public.employee_schedules; b public.booths; s public.shifts; dist numeric; late integer; st public.attendance_status; outrow public.attendances;
begin
 if u is null then raise exception 'not_authenticated'; end if; d=(n at time zone 'Asia/Jakarta')::date;
 select * into sched from public.employee_schedules where employee_id=u and work_date=d;
 if not found then raise exception 'schedule_not_found'; end if;
 if not public.assigned_to(u,sched.booth_id,d) then raise exception 'not_assigned';end if;
 select * into b from public.booths where id=sched.booth_id and is_active; select * into s from public.shifts where id=sched.shift_id and is_active;
 if p_lat is null or p_lon is null or b.latitude is null then dist=null;st='location_unavailable'; else dist=public.distance_m(p_lat,p_lon,b.latitude,b.longitude);st=case when dist>b.attendance_radius_m then 'outside_radius' else 'on_time' end;end if;
 late=greatest(0,floor(extract(epoch from ((n at time zone b.timezone)-(d+s.start_time)))/60)::integer-s.late_tolerance_minutes);
 if st='on_time' and late>0 then st='late';end if;
 insert into public.attendances(user_id,booth_id,shift_id,attendance_date,check_in_at,check_in_original_path,check_in_watermarked_path,check_in_photo_hash,check_in_latitude,check_in_longitude,check_in_accuracy_m,check_in_distance_m,late_minutes,status,device_info,check_in_idempotency_key)
 values(u,b.id,s.id,d,n,p_original_path,p_watermarked_path,p_hash,p_lat,p_lon,p_accuracy,dist,late,st,left(p_device,300),p_idempotency)
 on conflict(user_id,check_in_idempotency_key) do update set check_in_idempotency_key=excluded.check_in_idempotency_key returning * into outrow;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(u,'check_in','attendance',outrow.id::text,jsonb_build_object('server_time',n,'status',outrow.status));return outrow;
end$$;
create function public.record_check_out(p_original_path text,p_watermarked_path text,p_hash text,p_lat numeric,p_lon numeric,p_accuracy numeric,p_idempotency text)
returns public.attendances language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();n timestamptz:=now();d date:=(now() at time zone 'Asia/Jakarta')::date;a public.attendances;b public.booths;dist numeric;
begin
 select * into a from public.attendances where user_id=u and attendance_date=d for update;if not found then raise exception 'check_in_required';end if;
 if a.check_out_at is not null then if a.check_out_idempotency_key=p_idempotency then return a;else raise exception 'already_checked_out';end if;end if;
 select * into b from public.booths where id=a.booth_id;if p_lat is not null and b.latitude is not null then dist=public.distance_m(p_lat,p_lon,b.latitude,b.longitude);end if;
 update public.attendances set check_out_at=n,check_out_original_path=p_original_path,check_out_watermarked_path=p_watermarked_path,check_out_photo_hash=p_hash,check_out_latitude=p_lat,check_out_longitude=p_lon,check_out_accuracy_m=p_accuracy,check_out_distance_m=dist,work_duration_minutes=floor(extract(epoch from(n-check_in_at))/60),check_out_idempotency_key=p_idempotency where id=a.id returning * into a;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)values(u,'check_out','attendance',a.id::text,jsonb_build_object('server_time',n));return a;
end$$;
revoke all on function public.record_check_in(text,text,text,numeric,numeric,numeric,text,text) from public;grant execute on function public.record_check_in(text,text,text,numeric,numeric,numeric,text,text) to authenticated;
revoke all on function public.record_check_out(text,text,text,numeric,numeric,numeric,text) from public;grant execute on function public.record_check_out(text,text,text,numeric,numeric,numeric,text) to authenticated;

create function public.verify_record(p_type text,p_id uuid,p_status public.verification_status,p_note text) returns void language plpgsql security definer set search_path='' as $$declare old public.verification_status;begin if not public.is_admin() then raise exception 'forbidden';end if;if p_status='pending' then raise exception 'invalid_status';end if;if p_type='attendance' then select verification_status into old from public.attendances where id=p_id for update;if not found then raise exception 'record_not_found';end if;update public.attendances set verification_status=p_status,admin_note=left(p_note,1000) where id=p_id;elsif p_type='stock_check' then select verification_status into old from public.stock_checks where id=p_id for update;if not found then raise exception 'record_not_found';end if;update public.stock_checks set verification_status=p_status,admin_note=left(p_note,1000) where id=p_id;else raise exception 'invalid_record_type';end if;insert into public.verification_logs(record_type,record_id,previous_status,new_status,note,admin_id)values(p_type,p_id,old,p_status,left(p_note,1000),auth.uid());insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)values(auth.uid(),'verify',p_type,p_id::text,jsonb_build_object('status',p_status));end$$;
grant execute on function public.verify_record(text,uuid,public.verification_status,text) to authenticated;

do $$declare t text;begin foreach t in array array['profiles','booths','employee_booth_assignments','shifts','employee_schedules','attendances','stock_items','booth_stock_items','stock_checks','stock_check_details','stock_check_photos','booth_checklists','verification_logs','audit_logs'] loop execute format('alter table public.%I enable row level security',t);end loop;end$$;
create policy profile_self_read on public.profiles for select using(id=auth.uid() or public.is_admin());
create policy profile_admin_write on public.profiles for all using(public.is_admin()) with check(public.is_admin());
create policy booth_employee_read on public.booths for select using(public.is_admin() or public.assigned_to(auth.uid(),id));
create policy booth_admin_write on public.booths for all using(public.is_admin()) with check(public.is_admin());
create policy assignment_read on public.employee_booth_assignments for select using(employee_id=auth.uid() or public.is_admin());
create policy assignment_admin_write on public.employee_booth_assignments for all using(public.is_admin()) with check(public.is_admin());
create policy shifts_read on public.shifts for select using(public.is_admin() or public.assigned_to(auth.uid(),booth_id));
create policy shifts_admin_write on public.shifts for all using(public.is_admin()) with check(public.is_admin());
create policy schedules_read on public.employee_schedules for select using(employee_id=auth.uid() or public.is_admin());
create policy schedules_admin_write on public.employee_schedules for all using(public.is_admin()) with check(public.is_admin());
create policy attendance_read on public.attendances for select using(user_id=auth.uid() or public.is_admin());
create policy attendance_admin_update on public.attendances for update using(public.is_admin()) with check(public.is_admin());
create policy stock_items_read on public.stock_items for select to authenticated using(is_active or public.is_admin());
create policy stock_items_admin_write on public.stock_items for all using(public.is_admin()) with check(public.is_admin());
create policy booth_items_read on public.booth_stock_items for select using(public.is_admin() or public.assigned_to(auth.uid(),booth_id));
create policy booth_items_admin_write on public.booth_stock_items for all using(public.is_admin()) with check(public.is_admin());
create policy checks_read on public.stock_checks for select using(user_id=auth.uid() or public.is_admin());
create policy checks_insert on public.stock_checks for insert with check(user_id=auth.uid() and public.assigned_to(auth.uid(),booth_id,check_date) and check_date=(now() at time zone 'Asia/Jakarta')::date);
create policy checks_admin_update on public.stock_checks for update using(public.is_admin()) with check(public.is_admin());
create policy details_read on public.stock_check_details for select using(public.is_admin() or exists(select 1 from public.stock_checks c where c.id=stock_check_id and c.user_id=auth.uid()));
create policy details_insert on public.stock_check_details for insert with check(exists(select 1 from public.stock_checks c where c.id=stock_check_id and c.user_id=auth.uid() and c.check_date=(now() at time zone 'Asia/Jakarta')::date));
create policy photos_read on public.stock_check_photos for select using(public.is_admin() or exists(select 1 from public.stock_checks c where c.id=stock_check_id and c.user_id=auth.uid()));
create policy photos_insert on public.stock_check_photos for insert with check(exists(select 1 from public.stock_checks c where c.id=stock_check_id and c.user_id=auth.uid()));
create policy checklist_read on public.booth_checklists for select using(public.is_admin() or public.assigned_to(auth.uid(),booth_id));
create policy checklist_admin_write on public.booth_checklists for all using(public.is_admin()) with check(public.is_admin());
create policy verification_admin_read on public.verification_logs for select using(public.is_admin());
create policy audit_admin_read on public.audit_logs for select using(public.is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('attendance-originals','attendance-originals',false,8388608,array['image/jpeg','image/png','image/webp']),
('attendance-watermarked','attendance-watermarked',false,1048576,array['image/webp']),
('stock-originals','stock-originals',false,8388608,array['image/jpeg','image/png','image/webp']),
('stock-watermarked','stock-watermarked',false,1048576,array['image/webp']) on conflict(id) do nothing;
create policy storage_admin_read on storage.objects for select using(bucket_id in('attendance-originals','attendance-watermarked','stock-originals','stock-watermarked') and public.is_admin());
-- Upload dilakukan route server setelah autentikasi/otorisasi; tidak ada policy insert client.
commit;
