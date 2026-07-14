import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {processPhoto} from "@/lib/photo";
import {attendanceUploadSchema} from "@/lib/validation";
import {apiError,apiSuccess,publicError} from "@/lib/api-response";
import {getActiveBooth,todayWib} from "@/lib/operations";

export const runtime="nodejs";

async function uploadVerified(admin:ReturnType<typeof createAdminClient>,bucket:string,path:string,body:Buffer){
  const {data,error}=await admin.storage.from(bucket).upload(path,body,{contentType:"image/webp",upsert:false});
  if(error||!data?.path)throw error||new Error("storage_upload_missing_path");
  const slash=path.lastIndexOf("/");
  const folder=path.slice(0,slash),name=path.slice(slash+1);
  const {data:files,error:listError}=await admin.storage.from(bucket).list(folder,{search:name,limit:10});
  if(listError||!files?.some(file=>file.name===name))throw listError||new Error("storage_verification_failed");
}

export async function POST(request:Request){
  let admin:ReturnType<typeof createAdminClient>|null=null;
  const uploaded:{bucket:string;path:string}[]=[];
  let userId:string|undefined;
  let boothId:string|undefined;
  try{
    const supabase=await createClient();
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||!user)return apiError("UNAUTHENTICATED","Sesi berakhir. Silakan masuk kembali.",401);
    userId=user.id;
    const {data:profile,error:profileError}=await supabase.from("profiles").select("full_name,role,is_active").eq("id",user.id).single();
    if(profileError||!profile?.is_active||profile.role!=="employee")return apiError("FORBIDDEN","Akun pekerja tidak aktif.",403);

    const fd=await request.formData();
    const nullable=(value:FormDataEntryValue|null)=>value==null||value===""?null:Number(value);
    const input=attendanceUploadSchema.parse({action:fd.get("action"),idempotencyKey:fd.get("idempotencyKey"),latitude:nullable(fd.get("latitude")),longitude:nullable(fd.get("longitude")),accuracy:nullable(fd.get("accuracy"))});
    const file=fd.get("photo");
    if(!(file instanceof File))return apiError("PHOTO_REQUIRED","Ambil foto wajah terlebih dahulu.",400);

    const booth=await getActiveBooth();
    if(!booth)return apiError("BOOTH_NOT_CONFIGURED","Booth aktif belum dikonfigurasi. Hubungi admin.",409);
    boothId=booth.id;
    const {data:canUse,error:accessError}=await supabase.rpc("can_use_active_booth",{p_user:user.id,p_booth:booth.id,p_date:todayWib()});
    if(accessError)throw accessError;if(!canUse)return apiError("BOOTH_ASSIGNMENT_REQUIRED","Konfigurasi booth pekerja belum lengkap. Hubungi admin.",409);
    const keyColumn=input.action==="check_in"?"check_in_idempotency_key":"check_out_idempotency_key";
    const {data:previous,error:previousError}=await supabase.from("attendances").select("id,check_in_at,check_out_at,check_in_watermarked_path,check_out_watermarked_path,status").eq("user_id",user.id).eq(keyColumn,input.idempotencyKey).maybeSingle();
    if(previousError)throw previousError;
    if(previous){const photoPath=input.action==="check_in"?previous.check_in_watermarked_path:previous.check_out_watermarked_path;const capturedAt=input.action==="check_in"?previous.check_in_at:previous.check_out_at;return apiSuccess({recordId:previous.id,photoPath,capturedAt,status:previous.status},200,"Permintaan sebelumnya sudah tercatat.");}
    const serverTime=new Date();
    const display=new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",dateStyle:"short",timeStyle:"medium"}).format(serverTime);
    const activity=input.action==="check_in"?"Presensi Masuk":"Presensi Pulang";
    const coords=input.latitude===null?"Lokasi tidak tersedia":`${input.latitude.toFixed(6)}, ${input.longitude?.toFixed(6)}`;
    const image=await processPhoto(file,[profile.full_name,booth.name,activity,`${display} WIB`,coords]);

    const recordKey=crypto.randomUUID();
    const path=`${user.id}/${recordKey}/${input.action}-${crypto.randomUUID()}.webp`;
    admin=createAdminClient();
    for(const [bucket,body] of [["attendance-originals",image.original],["attendance-watermarked",image.watermarked]] as const){
      await uploadVerified(admin,bucket,path,body);
      uploaded.push({bucket,path});
    }

    const fn=input.action==="check_in"?"record_check_in":"record_check_out";
    const params=input.action==="check_in"?{
      p_original_path:path,p_watermarked_path:path,p_hash:image.hash,p_lat:input.latitude,p_lon:input.longitude,p_accuracy:input.accuracy,p_device:(request.headers.get("user-agent")||"").slice(0,300),p_idempotency:input.idempotencyKey,
    }:{p_original_path:path,p_watermarked_path:path,p_hash:image.hash,p_lat:input.latitude,p_lon:input.longitude,p_accuracy:input.accuracy,p_idempotency:input.idempotencyKey};
    const {data,error}=await supabase.rpc(fn,params);
    if(error)throw error;
    const record=data as {id:string;check_in_at:string;check_out_at:string|null;status:string};
    const warning=record.status==="outside_radius"?"Presensi tercatat dan ditandai di luar radius.":record.status==="location_unavailable"?"Presensi tercatat tanpa lokasi dan akan diperiksa admin.":null;
    return apiSuccess({recordId:record.id,photoPath:path,capturedAt:input.action==="check_in"?record.check_in_at:record.check_out_at,status:record.status},200,warning);
  }catch(error){
    console.error("ATTENDANCE_PHOTO_UPLOAD_FAILED",{userId,boothId,error:error instanceof Error?error.message:String(error)});
    if(admin)for(const file of uploaded)await admin.storage.from(file.bucket).remove([file.path]).catch(()=>undefined);
    const safe=publicError(error,"Presensi belum berhasil disimpan. Foto tetap ada di perangkat; silakan coba lagi.");
    return apiError(safe.code,safe.message,safe.status);
  }
}
