import {z} from "zod";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {processPhoto} from "@/lib/photo";
import {locationSchema,stockDetailSchema,stockPhotoCategorySchema} from "@/lib/validation";
import {apiError,apiSuccess,publicError} from "@/lib/api-response";
import {getActiveBooth,todayWib} from "@/lib/operations";

export const runtime="nodejs";
const inputSchema=z.object({
  idempotencyKey:z.string().min(16).max(100),location:locationSchema,note:z.string().trim().max(1000),details:z.array(stockDetailSchema).min(1),
  checklist:z.record(z.string(),z.enum(["good","issue"])),photoCategories:z.array(stockPhotoCategorySchema).length(3),
});
const categoryLabels={freezer:"Freezer / stok ayam",shelf:"Rak bahan & kemasan",booth:"Area booth"} as const;

async function uploadVerified(admin:ReturnType<typeof createAdminClient>,bucket:string,path:string,body:Buffer){
  const {data,error}=await admin.storage.from(bucket).upload(path,body,{contentType:"image/webp",upsert:false});
  if(error||!data?.path)throw error||new Error("storage_upload_missing_path");
  const slash=path.lastIndexOf("/"),folder=path.slice(0,slash),name=path.slice(slash+1);
  const {data:files,error:listError}=await admin.storage.from(bucket).list(folder,{search:name,limit:10});
  if(listError||!files?.some(file=>file.name===name))throw listError||new Error("storage_verification_failed");
}

export async function POST(request:Request){
  let admin:ReturnType<typeof createAdminClient>|null=null;
  const uploaded:{bucket:string;path:string}[]=[];
  let checkId:string|null=null,userId:string|undefined,boothId:string|undefined;
  try{
    const supabase=await createClient();
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||!user)return apiError("UNAUTHENTICATED","Sesi berakhir. Silakan masuk kembali.",401);
    userId=user.id;
    const {data:profile,error:profileError}=await supabase.from("profiles").select("full_name,role,is_active").eq("id",user.id).single();
    if(profileError||!profile?.is_active||profile.role!=="employee")return apiError("FORBIDDEN","Akun pekerja tidak aktif.",403);
    const booth=await getActiveBooth();
    if(!booth)return apiError("BOOTH_NOT_CONFIGURED","Booth aktif belum dikonfigurasi. Hubungi admin.",409);
    boothId=booth.id;
    const today=todayWib();const {data:canUse,error:accessError}=await supabase.rpc("can_use_active_booth",{p_user:user.id,p_booth:booth.id,p_date:today});
    if(accessError)throw accessError;if(!canUse)return apiError("BOOTH_ASSIGNMENT_REQUIRED","Konfigurasi booth pekerja belum lengkap. Hubungi admin.",409);

    const fd=await request.formData();
    const input=inputSchema.parse(JSON.parse(String(fd.get("payload")||"{}")));
    const files=fd.getAll("photos").filter((value):value is File=>value instanceof File);
    if(files.length!==3)return apiError("PHOTOS_REQUIRED","Lengkapi tiga foto bukti stok.",400);
    if(new Set(input.photoCategories).size!==3)return apiError("INVALID_PHOTO_CATEGORIES","Kategori foto stok belum lengkap.",400);

    admin=createAdminClient();
    const {data:existing,error:existingError}=await admin.from("stock_checks").select("id,checked_at,idempotency_key").eq("user_id",user.id).eq("booth_id",booth.id).eq("check_date",today).maybeSingle();
    if(existingError)throw existingError;
    if(existing?.idempotency_key===input.idempotencyKey)return apiSuccess({recordId:existing.id,capturedAt:existing.checked_at,locationStatus:"saved",photos:[]},200,"Permintaan sebelumnya sudah tercatat.");
    if(existing)return apiError("ALREADY_SUBMITTED","Pengecekan stok hari ini sudah terkirim.",409);

    let distance:number|null=null;
    if(input.location.latitude!==null&&booth.latitude!==null){
      const {data,error}=await admin.rpc("distance_m",{lat1:input.location.latitude,lon1:input.location.longitude,lat2:booth.latitude,lon2:booth.longitude});
      if(error)throw error;
      distance=Number(data);
    }
    const locationStatus=input.location.latitude===null?"location_unavailable":distance!==null&&distance>booth.attendance_radius_m?"outside_radius":"within_radius";
    checkId=crypto.randomUUID();
    const {error:checkError}=await admin.from("stock_checks").insert({id:checkId,user_id:user.id,booth_id:booth.id,check_date:today,latitude:input.location.latitude,longitude:input.location.longitude,accuracy_m:input.location.accuracy,distance_m:distance,location_status:locationStatus,worker_note:input.note,checklist:input.checklist,idempotency_key:input.idempotencyKey});
    if(checkError)throw checkError;

    const {data:master,error:masterError}=await admin.from("booth_stock_items").select("stock_item_id,minimum_stock").eq("booth_id",booth.id).eq("is_active",true);
    if(masterError)throw masterError;
    const minimum=new Map(master.map(item=>[item.stock_item_id,Number(item.minimum_stock)]));
    const allowed=new Set(master.map(item=>item.stock_item_id));
    const submittedIds=input.details.map(detail=>detail.stockItemId);
    if(input.details.some(detail=>!allowed.has(detail.stockItemId))||new Set(submittedIds).size!==submittedIds.length||submittedIds.length!==allowed.size)throw new Error("invalid_stock_item");
    const {data:checklistMaster,error:checklistError}=await admin.from("booth_checklists").select("id").eq("booth_id",booth.id).eq("is_active",true);if(checklistError)throw checklistError;
    const checklistIds=new Set((checklistMaster||[]).map(item=>item.id));if(Object.keys(input.checklist).some(id=>!checklistIds.has(id))||Object.keys(input.checklist).length!==checklistIds.size)throw new Error("invalid_checklist");
    const details=input.details.map(detail=>{
      const min=minimum.get(detail.stockItemId)||0;
      const status=detail.physical<=0?"empty":detail.physical<=min?"low":"safe";
      return{stock_check_id:checkId,stock_item_id:detail.stockItemId,opening_qty:detail.physical,incoming_qty:0,usage_qty:0,physical_qty:detail.physical,minimum_stock:min,status,worker_note:detail.note||null};
    });
    const {error:detailError}=await admin.from("stock_check_details").insert(details);
    if(detailError)throw detailError;

    const display=new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",dateStyle:"short",timeStyle:"medium"}).format(new Date());
    const savedPhotos:{category:string;path:string;hash:string}[]=[];
    for(let index=0;index<files.length;index++){
      const category=input.photoCategories[index];
      const coords=input.location.latitude===null?"Lokasi tidak tersedia":`${input.location.latitude.toFixed(6)}, ${input.location.longitude?.toFixed(6)}`;
      const image=await processPhoto(files[index],[profile.full_name,booth.name,categoryLabels[category],`${display} WIB`,coords]);
      const path=`${user.id}/${checkId}/${category}-${crypto.randomUUID()}.webp`;
      for(const [bucket,body] of [["stock-originals",image.original],["stock-watermarked",image.watermarked]] as const){await uploadVerified(admin,bucket,path,body);uploaded.push({bucket,path});}
      const {error:photoError}=await admin.from("stock_check_photos").insert({stock_check_id:checkId,category:categoryLabels[category],original_path:path,watermarked_path:path,photo_hash:image.hash,latitude:input.location.latitude,longitude:input.location.longitude,accuracy_m:input.location.accuracy,metadata:{width:image.width,height:image.height,size:image.size}});
      if(photoError)throw photoError;
      savedPhotos.push({category,path,hash:image.hash});
    }
    const {data:final,error:finalError}=await admin.from("stock_checks").select("id,checked_at").eq("id",checkId).single();
    if(finalError||!final)throw finalError||new Error("stock_check_verification_failed");
    return apiSuccess({recordId:final.id,capturedAt:final.checked_at,locationStatus,photos:savedPhotos},201,locationStatus!=="within_radius"?"Laporan tersimpan dan lokasi ditandai untuk diperiksa.":null);
  }catch(error){
    console.error("STOCK_PHOTO_UPLOAD_FAILED",{userId,boothId,checkId,error:error instanceof Error?error.message:String(error)});
    if(admin){
      for(const file of uploaded)await admin.storage.from(file.bucket).remove([file.path]).catch(()=>undefined);
      if(checkId){await admin.from("stock_check_photos").delete().eq("stock_check_id",checkId);await admin.from("stock_check_details").delete().eq("stock_check_id",checkId);await admin.from("stock_checks").delete().eq("id",checkId);}
    }
    const safe=publicError(error,"Laporan stok belum berhasil disimpan. Foto dan isian tetap tersedia; silakan coba lagi.");
    return apiError(safe.code,safe.message,safe.status);
  }
}
