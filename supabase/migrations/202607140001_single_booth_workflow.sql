begin;

alter table public.profiles add column if not exists phone text check (phone is null or char_length(phone)<=30);
alter table public.profiles add column if not exists employment_start_date date;

create or replace function public.can_use_active_booth(p_user uuid,p_booth uuid,p_date date default current_date)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.profiles p join public.booths b on b.id=p_booth
    where p.id=p_user and p.role='employee' and p.is_active and b.is_active and b.deleted_at is null
      and (
        public.assigned_to(p_user,p_booth,p_date)
        or (select count(*) from public.booths active where active.is_active and active.deleted_at is null)=1
      )
  )
$$;
revoke all on function public.can_use_active_booth(uuid,uuid,date) from public;
grant execute on function public.can_use_active_booth(uuid,uuid,date) to authenticated;

create or replace function public.record_check_in(p_original_path text,p_watermarked_path text,p_hash text,p_lat numeric,p_lon numeric,p_accuracy numeric,p_device text,p_idempotency text)
returns public.attendances language plpgsql security definer set search_path='' as $$
declare
  u uuid:=auth.uid(); n timestamptz:=now(); d date; sched public.employee_schedules;
  b public.booths; s public.shifts; dist numeric; late integer:=0; st public.attendance_status; outrow public.attendances;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.profiles where id=u and role='employee' and is_active) then raise exception 'forbidden'; end if;
  d=(n at time zone 'Asia/Jakarta')::date;

  select * into sched from public.employee_schedules where employee_id=u and work_date=d;
  if found then
    select * into b from public.booths where id=sched.booth_id and is_active and deleted_at is null;
    select * into s from public.shifts where id=sched.shift_id and booth_id=b.id and is_active and deleted_at is null;
  end if;

  if b.id is null then
    select * into b from public.booths
      where is_active and deleted_at is null and public.can_use_active_booth(u,id,d)
      order by created_at limit 1;
  end if;
  if b.id is null then raise exception 'not_assigned'; end if;

  if s.id is null then
    select * into s from public.shifts where booth_id=b.id and is_active and deleted_at is null order by start_time limit 1;
  end if;
  if s.id is null then
    insert into public.shifts(booth_id,name,start_time,end_time,late_tolerance_minutes)
      values(b.id,'Shift Utama','08:00','17:00',10) returning * into s;
  end if;

  if p_lat is null or p_lon is null or b.latitude is null then
    dist=null;st='location_unavailable';
  else
    dist=public.distance_m(p_lat,p_lon,b.latitude,b.longitude);
    st=case when dist>b.attendance_radius_m then 'outside_radius' else 'on_time' end;
  end if;
  late=greatest(0,floor(extract(epoch from ((n at time zone b.timezone)-(d+s.start_time)))/60)::integer-s.late_tolerance_minutes);
  if st='on_time' and late>0 then st='late';end if;

  insert into public.attendances(user_id,booth_id,shift_id,attendance_date,check_in_at,check_in_original_path,check_in_watermarked_path,check_in_photo_hash,check_in_latitude,check_in_longitude,check_in_accuracy_m,check_in_distance_m,late_minutes,status,device_info,check_in_idempotency_key)
  values(u,b.id,s.id,d,n,p_original_path,p_watermarked_path,p_hash,p_lat,p_lon,p_accuracy,dist,late,st,left(p_device,300),p_idempotency)
  on conflict(user_id,check_in_idempotency_key) do update set check_in_idempotency_key=excluded.check_in_idempotency_key returning * into outrow;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(u,'check_in','attendance',outrow.id::text,jsonb_build_object('server_time',n,'status',outrow.status));
  return outrow;
end$$;
revoke all on function public.record_check_in(text,text,text,numeric,numeric,numeric,text,text) from public;
grant execute on function public.record_check_in(text,text,text,numeric,numeric,numeric,text,text) to authenticated;

drop policy if exists booth_employee_read on public.booths;
create policy booth_employee_read on public.booths for select using(public.is_admin() or public.can_use_active_booth(auth.uid(),id,(now() at time zone 'Asia/Jakarta')::date));
drop policy if exists shifts_read on public.shifts;
create policy shifts_read on public.shifts for select using(public.is_admin() or public.can_use_active_booth(auth.uid(),booth_id,(now() at time zone 'Asia/Jakarta')::date));
drop policy if exists booth_items_read on public.booth_stock_items;
create policy booth_items_read on public.booth_stock_items for select using(public.is_admin() or public.can_use_active_booth(auth.uid(),booth_id,(now() at time zone 'Asia/Jakarta')::date));
drop policy if exists checks_insert on public.stock_checks;
create policy checks_insert on public.stock_checks for insert with check(user_id=auth.uid() and public.can_use_active_booth(auth.uid(),booth_id,check_date) and check_date=(now() at time zone 'Asia/Jakarta')::date);
drop policy if exists checklist_read on public.booth_checklists;
create policy checklist_read on public.booth_checklists for select using(public.is_admin() or public.can_use_active_booth(auth.uid(),booth_id,(now() at time zone 'Asia/Jakarta')::date));

commit;
