import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processPhoto } from "@/lib/photo";
import { locationSchema, stockDetailSchema } from "@/lib/validation";

export const runtime = "nodejs";
const inputSchema = z.object({ idempotencyKey:z.string().min(16).max(100), boothId:z.uuid(), location:locationSchema, note:z.string().max(1000), details:z.array(stockDetailSchema).min(1), checklist:z.record(z.string(),z.boolean()) });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:"Sesi berakhir" }, { status:401 });
  const uploaded: { bucket:string; path:string }[] = [];
  let checkId: string | null = null;
  try {
    const fd = await request.formData();
    const input = inputSchema.parse(JSON.parse(String(fd.get("payload"))));
    const files = fd.getAll("photos").filter((v): v is File => v instanceof File);
    if (files.length < 1 || files.length > 5) throw new Error("Ambil 1 sampai 5 foto stok");
    const today = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Jakarta" }).format(new Date());
    const { data:booth } = await supabase.from("booths").select("id,name,latitude,longitude,attendance_radius_m").eq("id",input.boothId).single();
    if (!booth) throw new Error("Booth tidak ditemukan");
    const { data:profile } = await supabase.from("profiles").select("full_name").eq("id",user.id).single();
    let distance: number | null = null;
    if (input.location.latitude !== null && booth.latitude !== null) {
      const { data } = await supabase.rpc("distance_m", { lat1:input.location.latitude, lon1:input.location.longitude, lat2:booth.latitude, lon2:booth.longitude });
      distance = data;
    }
    const locationStatus = input.location.latitude === null ? "location_unavailable" : distance !== null && distance > booth.attendance_radius_m ? "outside_radius" : "within_radius";
    checkId = crypto.randomUUID();
    const { error:checkError } = await supabase.from("stock_checks").insert({ id:checkId, user_id:user.id, booth_id:booth.id, check_date:today, latitude:input.location.latitude, longitude:input.location.longitude, accuracy_m:input.location.accuracy, distance_m:distance, location_status:locationStatus, worker_note:input.note, checklist:input.checklist, idempotency_key:input.idempotencyKey });
    if (checkError) throw checkError;
    const { data:master } = await supabase.from("booth_stock_items").select("stock_item_id,minimum_stock").eq("booth_id",booth.id);
    const minimum = new Map(master?.map(x => [x.stock_item_id, Number(x.minimum_stock)]));
    const details = input.details.map(d => { const expected=d.opening+d.incoming-d.usage,min=minimum.get(d.stockItemId)||0; const status=Math.abs(expected-d.physical)>.01?"discrepancy":d.physical<=0?"empty":d.physical<=min?"low":"safe"; return { stock_check_id:checkId, stock_item_id:d.stockItemId, opening_qty:d.opening, incoming_qty:d.incoming, usage_qty:d.usage, physical_qty:d.physical, minimum_stock:min, status, worker_note:d.note }; });
    const { error:detailError } = await supabase.from("stock_check_details").insert(details);
    if (detailError) throw detailError;
    const admin = createAdminClient();
    const display = new Intl.DateTimeFormat("id-ID", { timeZone:"Asia/Jakarta", dateStyle:"short", timeStyle:"medium" }).format(new Date());
    for (let i=0; i<files.length; i++) {
      const coords = input.location.latitude === null ? "Lokasi tidak tersedia" : `${input.location.latitude.toFixed(6)}, ${input.location.longitude?.toFixed(6)}`;
      const image = await processPhoto(files[i], [profile?.full_name||"Pekerja",booth.name,`Cek Stok • Foto ${i+1}`,`${display} WIB`,coords]);
      const path = `${user.id}/${checkId}/stock-${i+1}-${crypto.randomUUID()}.webp`;
      for (const [bucket,body] of [["stock-originals",image.original],["stock-watermarked",image.watermarked]] as const) {
        const { error } = await admin.storage.from(bucket).upload(path,body,{contentType:"image/webp",upsert:false});
        if (error) throw error;
        uploaded.push({bucket,path});
      }
      const { error } = await supabase.from("stock_check_photos").insert({ stock_check_id:checkId, category:`Foto ${i+1}`, original_path:path, watermarked_path:path, photo_hash:image.hash, latitude:input.location.latitude, longitude:input.location.longitude, accuracy_m:input.location.accuracy, metadata:{width:image.width,height:image.height,size:image.size} });
      if (error) throw error;
    }
    return NextResponse.json({ data:{id:checkId,locationStatus}, warning:locationStatus!=="within_radius"?"Laporan tersimpan dan ditandai untuk pemeriksaan lokasi.":null });
  } catch (error) {
    const admin = createAdminClient();
    for (const file of uploaded) await admin.storage.from(file.bucket).remove([file.path]);
    if (checkId) {
      await admin.from("stock_check_photos").delete().eq("stock_check_id",checkId);
      await admin.from("stock_check_details").delete().eq("stock_check_id",checkId);
      await admin.from("stock_checks").delete().eq("id",checkId);
    }
    return NextResponse.json({ error:error instanceof Error?error.message:"Laporan gagal" }, { status:400 });
  }
}
