import {NextResponse} from "next/server";
import {currentProfile} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {toCsv} from "@/lib/domain";
import {formatWib} from "@/lib/format";
import {apiError,publicError} from "@/lib/api-response";

export async function GET(_:Request,{params}:{params:Promise<{type:string}>}){
  try{
    const profile=await currentProfile();if(!profile||profile.role!=="admin"||!profile.is_active)return apiError("FORBIDDEN","Akses admin diperlukan.",403);
    const {type}=await params;const sb=await createClient();let csv:string;
    if(type==="attendance"){
      const {data,error}=await sb.from("attendances").select("*,profiles(full_name),booths(name),shifts(name,start_time)").order("attendance_date",{ascending:false});if(error)throw error;
      const headers=["Tanggal","Nama pekerja","Booth","Shift","Jadwal masuk","Waktu masuk","Waktu pulang","Durasi kerja","Menit keterlambatan","Jarak masuk","Jarak pulang","Status","Verifikasi","Catatan admin"];
      csv=toCsv(headers,(data||[]).map(item=>[item.attendance_date.split("-").reverse().join("-"),(item.profiles as unknown as {full_name:string}).full_name,(item.booths as unknown as {name:string}).name,(item.shifts as unknown as {name:string}).name,(item.shifts as unknown as {start_time:string}).start_time.slice(0,5),formatWib(item.check_in_at),item.check_out_at?formatWib(item.check_out_at):"",item.work_duration_minutes,item.late_minutes,item.check_in_distance_m,item.check_out_distance_m,item.status,item.verification_status,item.admin_note]));
    }else if(type==="stock"){
      const {data,error}=await sb.from("stock_check_details").select("*,stock_items(name,unit),stock_checks(check_date,profiles(full_name),booths(name))").order("created_at",{ascending:false});if(error)throw error;
      const headers=["Tanggal","Booth","Pekerja","Item","Satuan","Jumlah awal","Stok masuk","Pemakaian","Jumlah fisik","Selisih","Stok minimum","Status","Catatan"];
      csv=toCsv(headers,(data||[]).map(detail=>{const check=detail.stock_checks as unknown as {check_date:string;profiles:{full_name:string};booths:{name:string}};const item=detail.stock_items as unknown as {name:string;unit:string};return[check.check_date.split("-").reverse().join("-"),check.booths.name,check.profiles.full_name,item.name,item.unit,detail.opening_qty,detail.incoming_qty,detail.usage_qty,detail.physical_qty,Number(detail.physical_qty)-Number(detail.expected_qty),detail.minimum_stock,detail.status,detail.worker_note]}));
    }else return apiError("NOT_FOUND","Jenis laporan tidak dikenal.",404);
    return new NextResponse(csv,{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":`attachment; filename=rocky-${type}.csv`,"cache-control":"private, no-store"}});
  }catch(error){console.error("ADMIN_REPORT_FAILED",{error:error instanceof Error?error.message:String(error)});const safe=publicError(error,"Laporan belum berhasil dibuat.");return apiError(safe.code,safe.message,safe.status)}
}
