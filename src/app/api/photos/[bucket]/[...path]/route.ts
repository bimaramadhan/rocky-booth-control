import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {apiError,publicError} from "@/lib/api-response";

const allowed=new Set(["attendance-originals","attendance-watermarked","stock-originals","stock-watermarked"]);
export async function GET(_:Request,{params}:{params:Promise<{bucket:string;path:string[]}>}){
  try{
    const {bucket,path}=await params;if(!allowed.has(bucket))return apiError("FORBIDDEN","Bucket foto tidak diizinkan.",403);
    const supabase=await createClient();const {data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)return apiError("UNAUTHORIZED","Login diperlukan.",401);
    const {data:profile,error:profileError}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).single();if(profileError||!profile?.is_active)return apiError("FORBIDDEN","Akun tidak aktif.",403);
    const key=path.join("/");if(profile.role!=="admin"&&!key.startsWith(`${user.id}/`))return apiError("FORBIDDEN","Foto ini tidak dapat diakses.",403);
    const {data,error}=await createAdminClient().storage.from(bucket).createSignedUrl(key,60);if(error)throw error;
    return NextResponse.redirect(data.signedUrl,{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){console.error("PHOTO_ACCESS_FAILED",{error:error instanceof Error?error.message:String(error)});const safe=publicError(error,"Foto tidak ditemukan.");return apiError(safe.code,safe.message,safe.status===500?404:safe.status)}
}
