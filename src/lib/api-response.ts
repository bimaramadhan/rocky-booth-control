import "server-only";
import {NextResponse} from "next/server";
import {ZodError} from "zod";

const privateHeaders={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
export function apiSuccess<T>(data:T,status=200,warning:string|null=null){return NextResponse.json({success:true,data,warning},{status,headers:privateHeaders});}
export function apiError(code:string,message:string,status=400){return NextResponse.json({success:false,error:{code,message}},{status,headers:privateHeaders});}
export function publicError(error:unknown,fallback="Permintaan belum berhasil."){
  if(error instanceof ZodError)return {code:"INVALID_INPUT",message:error.issues[0]?.message||"Data yang dikirim belum lengkap.",status:400};
  const raw=error instanceof Error?error.message:"";
  const known:Record<string,[string,string,number]>={
    schedule_not_found:["CONFIGURATION_REQUIRED","Booth atau shift aktif belum dikonfigurasi. Hubungi admin.",409],
    shift_not_configured:["CONFIGURATION_REQUIRED","Shift utama belum dikonfigurasi. Hubungi admin.",409],
    check_in_required:["CHECK_IN_REQUIRED","Lakukan presensi masuk terlebih dahulu.",409],
    already_checked_out:["ALREADY_CHECKED_OUT","Presensi pulang hari ini sudah tercatat.",409],
    not_assigned:["BOOTH_NOT_AVAILABLE","Booth aktif belum tersedia. Hubungi admin.",409],
  };
  const match=Object.entries(known).find(([key])=>raw.includes(key));
  if(match){const [,value]=match;return{code:value[0],message:value[1],status:value[2]};}
  if(/bucket|storage|upload/i.test(raw))return{code:"PHOTO_UPLOAD_FAILED",message:"Foto belum berhasil diunggah. Periksa koneksi lalu coba lagi.",status:502};
  if(/mime|format foto|ukuran foto/i.test(raw))return{code:"INVALID_PHOTO",message:raw,status:400};
  return{code:"SERVER_ERROR",message:fallback,status:500};
}
