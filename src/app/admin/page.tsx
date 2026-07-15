import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {formatWib} from "@/lib/format";

export default async function Admin(){
  const sb=await createClient();const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date());
  const [{data:workers},{data:attendance},{data:checks}]=await Promise.all([
    sb.from("profiles").select("id,full_name").eq("role","employee").eq("is_active",true),
    sb.from("attendances").select("id,user_id,check_in_at,check_out_at,status,verification_status,profiles(full_name)").eq("attendance_date",today).order("check_in_at",{ascending:false}),
    sb.from("stock_checks").select("id,user_id,checked_at,verification_status,stock_check_details(status),profiles(full_name)").eq("check_date",today).order("checked_at",{ascending:false}),
  ]);
  const present=new Set(attendance?.map(item=>item.user_id));const stockUsers=new Set(checks?.map(item=>item.user_id));const activeWorkers=workers||[];
  const low=(checks||[]).flatMap(check=>check.stock_check_details as unknown as {status:string}[]).filter(item=>item.status==="low"||item.status==="empty").length;
  const cards=[
    {label:"Pekerja aktif",value:activeWorkers.length,tone:"neutral",hint:"Terdaftar"},
    {label:"Sudah masuk",value:present.size,tone:"good",hint:"Hari ini"},
    {label:"Belum presensi",value:activeWorkers.filter(worker=>!present.has(worker.id)).length,tone:"warn",hint:"Perlu dipantau"},
    {label:"Belum pulang",value:attendance?.filter(item=>!item.check_out_at).length||0,tone:"neutral",hint:"Masih bekerja"},
    {label:"Sudah cek stok",value:stockUsers.size,tone:"good",hint:"Laporan masuk"},
    {label:"Belum cek stok",value:activeWorkers.filter(worker=>!stockUsers.has(worker.id)).length,tone:"warn",hint:"Belum mengirim"},
    {label:"Stok bermasalah",value:low,tone:"bad",hint:"Menipis atau habis"},
    {label:"Perlu diperiksa",value:(attendance?.filter(item=>item.verification_status!=="verified").length||0)+(checks?.filter(item=>item.verification_status!=="verified").length||0),tone:"bad",hint:"Menunggu admin"},
  ];
  const displayDate=new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());
  return <div className="admin-dashboard"><header className="admin-page-heading"><div><span className="eyebrow">Ringkasan operasional</span><h1>Dashboard hari ini</h1><p>{displayDate}</p></div><span className="admin-live-badge"><i/>Data terbaru</span></header><div className="admin-metrics">{cards.map(card=><article className={`admin-metric metric-${card.tone}`} key={card.label}><div><small>{card.label}</small><strong>{card.value}</strong><span>{card.hint}</span></div><i aria-hidden/></article>)}</div>
    <div className="admin-activity-grid"><section className="card admin-feed"><div className="admin-section-title"><div><span className="eyebrow">Kehadiran</span><h2>Presensi hari ini</h2></div><Link href="/admin/attendance">Lihat semua</Link></div>{attendance?.length?attendance.slice(0,6).map(item=><div className="admin-feed-item" key={item.id}><span className="admin-feed-avatar">{(item.profiles as unknown as {full_name:string}).full_name.slice(0,1)}</span><div><strong>{(item.profiles as unknown as {full_name:string}).full_name}</strong><small>Masuk {formatWib(item.check_in_at,true)} · Pulang {item.check_out_at?formatWib(item.check_out_at,true):"belum"}</small></div><Link href={`/admin/attendance/${item.id}`}>Detail</Link></div>):<div className="admin-empty-mini">Belum ada presensi masuk hari ini.</div>}</section><section className="card admin-feed"><div className="admin-section-title"><div><span className="eyebrow">Persediaan</span><h2>Cek stok hari ini</h2></div><Link href="/admin/stock-checks">Lihat semua</Link></div>{checks?.length?checks.slice(0,6).map(item=><div className="admin-feed-item" key={item.id}><span className="admin-feed-avatar stock">S</span><div><strong>{(item.profiles as unknown as {full_name:string}).full_name}</strong><small>Dikirim {formatWib(item.checked_at,true)}</small></div><Link href={`/admin/stock-checks/${item.id}`}>Detail</Link></div>):<div className="admin-empty-mini">Belum ada laporan stok hari ini.</div>}</section></div>
    <div className="admin-notice"><span>i</span><p><strong>Catatan operasional</strong> Data waktu berasal dari server. Rekaman tanpa lokasi atau di luar radius tetap tersimpan dan otomatis ditandai untuk diperiksa.</p></div></div>;
}
