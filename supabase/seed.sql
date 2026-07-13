-- Seed master data. Akun Auth dibuat dengan scripts/create-demo-users.mjs terlebih dahulu.
insert into public.booths(id,name,address,timezone,latitude,longitude,attendance_radius_m) values
('10000000-0000-4000-8000-000000000001','Rocky Rooster Booth 1','Atur alamat dan koordinat booth','Asia/Jakarta',null,null,150) on conflict do nothing;
insert into public.shifts(id,booth_id,name,start_time,end_time,late_tolerance_minutes) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Shift Pagi','08:00','16:00',10),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Shift Sore','15:00','23:00',10) on conflict do nothing;
insert into public.stock_items(name,unit,default_minimum) values
('Ayam mentah','kg',5),('Tepung','kg',3),('Beras','kg',5),('Minyak goreng','liter',4),('Saus','botol',2),('Sambal','botol',2),('Kemasan nasi','pcs',30),('Plastik','pcs',30),('Gas LPG','tabung',1),('Air galon','galon',1),('Minuman','pcs',12),('Bahan lain','unit',1) on conflict do nothing;
insert into public.booth_stock_items(booth_id,stock_item_id,minimum_stock) select '10000000-0000-4000-8000-000000000001',id,default_minimum from public.stock_items on conflict do nothing;
insert into public.booth_checklists(booth_id,label,sort_order) select '10000000-0000-4000-8000-000000000001',x.label,x.ord from (values('Kebersihan meja',1),('Kebersihan alat masak',2),('Kondisi freezer',3),('Kondisi kompor',4),('Kondisi tabung gas',5),('Ketersediaan air',6),('Kebersihan area pelanggan',7),('Kondisi listrik',8)) x(label,ord) on conflict do nothing;
