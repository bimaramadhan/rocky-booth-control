import {StockCheckForm} from "@/components/stock-check-form";
import {requireRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {getActiveBooth,todayWib} from "@/lib/operations";
export default async function Stock(){
  const profile=await requireRole("employee");const admin=createAdminClient();const today=todayWib();const booth=await getActiveBooth();
  if(!booth)return <div className="empty-state"><span>⚙️</span><h1>Booth belum siap</h1><p>Admin perlu mengaktifkan satu booth sebelum pengecekan stok dapat dilakukan.</p></div>;
  const {data:done}=await admin.from("stock_checks").select("id,checked_at").eq("user_id",profile.id).eq("booth_id",booth.id).eq("check_date",today).maybeSingle();
  if(done)return <div className="success-panel compact"><div className="success-mark">✓</div><h1>Cek stok sudah selesai</h1><p>Laporan hari ini sudah tersimpan dan tidak dapat dikirim ulang tanpa tindakan admin.</p><a className="btn btn-primary" href="/employee">Kembali ke Beranda</a></div>;
  const [{data:rows,error:rowError},{data:checks}]=await Promise.all([admin.from("booth_stock_items").select("minimum_stock,stock_items(id,name,unit)").eq("booth_id",booth.id).eq("is_active",true),admin.from("booth_checklists").select("id,label").eq("booth_id",booth.id).eq("is_active",true).order("sort_order")]);
  if(rowError||!rows?.length)return <div className="empty-state"><span>📦</span><h1>Item stok belum tersedia</h1><p>Admin perlu menambahkan item stok untuk {booth.name}.</p></div>;
  const items=rows.map(row=>{const item=row.stock_items as unknown as {id:string;name:string;unit:string};return{...item,minimum:Number(row.minimum_stock)}});
  return <StockCheckForm boothName={booth.name} date={today.split("-").reverse().join("-")} items={items} checklists={checks||[]}/>;
}
