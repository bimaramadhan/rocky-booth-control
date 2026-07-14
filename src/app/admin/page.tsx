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
  const cards=[["Pekerja aktif",activeWorkers.length],["Sudah masuk",present.size],["Belum presensi",activeWorkers.filter(worker=>!present.has(worker.id)).length],["Belum pulang",attendance?.filter(item=>!item.check_out_at).length||0],["Sudah cek stok",stockUsers.size],["Belum cek stok",activeWorkers.filter(worker=>!stockUsers.has(worker.id)).length],["Stok menipis/habis",low],["Perlu diperiksa",(attendance?.filter(item=>item.verification_status!=="verified").length||0)+(checks?.filter(item=>item.verification_status!=="verified").length||0)]];
  return <><h1>Dashboard hari ini</h1><p>{today.split("-").reverse().join("-")}</p><div className="grid-cards">{cards.map(([label,value])=><div className="card" key={String(label)}><small>{label}</small><div style={{fontSize:"2rem",fontWeight:800}}>{value}</div></div>)}</div>
    <div className="grid-cards" style={{marginTop:16}}><section className="card"><h2>Presensi hari ini</h2>{attendance?.length?attendance.map(item=><p key={item.id}><strong>{(item.profiles as unknown as {full_name:string}).full_name}</strong><br/>Masuk {formatWib(item.check_in_at,true)} · Pulang {item.check_out_at?formatWib(item.check_out_at,true):"belum"} · <Link href={`/admin/attendance/${item.id}`}>Lihat bukti</Link></p>):<p>Belum ada presensi masuk.</p>}</section><section className="card"><h2>Cek stok hari ini</h2>{checks?.length?checks.map(item=><p key={item.id}><strong>{(item.profiles as unknown as {full_name:string}).full_name}</strong><br/>Dikirim {formatWib(item.checked_at,true)} · <Link href={`/admin/stock-checks/${item.id}`}>Lihat stok & foto</Link></p>):<p>Belum ada laporan stok.</p>}</section></div>
    <div className="card" style={{marginTop:16}}><h2>Catatan</h2><p>Data waktu berasal dari server. Rekaman tanpa lokasi atau di luar radius tetap tersimpan dan ditandai untuk diperiksa.</p></div></>;
}
