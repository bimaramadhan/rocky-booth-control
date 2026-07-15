import "server-only";
import {cache} from "react";
import {createAdminClient} from "@/lib/supabase/admin";

export type ActiveBooth={id:string;name:string;address:string;timezone:string;latitude:number|null;longitude:number|null;attendance_radius_m:number};
export type EmployeeTodayState={attendance:{id:string;check_in_at:string;check_out_at:string|null;status:string}|null;stock:{id:string;checked_at:string}|null};

export const getActiveBooth=cache(async():Promise<ActiveBooth|null>=>{
  const admin=createAdminClient();
  const {data,error}=await admin.from("booths").select("id,name,address,timezone,latitude,longitude,attendance_radius_m").eq("is_active",true).is("deleted_at",null).order("created_at").limit(1).maybeSingle();
  if(error)throw error;
  return data as ActiveBooth|null;
});

export const getEmployeeTodayState=cache(async(userId:string):Promise<EmployeeTodayState>=>{
  const admin=createAdminClient();const today=todayWib();
  const [{data:attendance,error:attendanceError},{data:stock,error:stockError}]=await Promise.all([
    admin.from("attendances").select("id,check_in_at,check_out_at,status").eq("user_id",userId).eq("attendance_date",today).maybeSingle(),
    admin.from("stock_checks").select("id,checked_at").eq("user_id",userId).eq("check_date",today).maybeSingle(),
  ]);
  if(attendanceError)throw attendanceError;if(stockError)throw stockError;
  return{attendance:attendance as EmployeeTodayState["attendance"],stock:stock as EmployeeTodayState["stock"]};
});

export function todayWib(date=new Date()){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(date);}
export function greetingWib(date=new Date()){
  const hour=Number(new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",hour:"2-digit",hourCycle:"h23"}).format(date));
  return hour<11?"Selamat pagi":hour<15?"Selamat siang":hour<18?"Selamat sore":"Selamat malam";
}
