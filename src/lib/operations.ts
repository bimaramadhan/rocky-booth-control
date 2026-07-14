import "server-only";
import {cache} from "react";
import {createAdminClient} from "@/lib/supabase/admin";

export type ActiveBooth={id:string;name:string;address:string;timezone:string;latitude:number|null;longitude:number|null;attendance_radius_m:number};

export const getActiveBooth=cache(async():Promise<ActiveBooth|null>=>{
  const admin=createAdminClient();
  const {data,error}=await admin.from("booths").select("id,name,address,timezone,latitude,longitude,attendance_radius_m").eq("is_active",true).is("deleted_at",null).order("created_at").limit(1).maybeSingle();
  if(error)throw error;
  return data as ActiveBooth|null;
});

export function todayWib(date=new Date()){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(date);}
export function greetingWib(date=new Date()){
  const hour=Number(new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",hour:"2-digit",hourCycle:"h23"}).format(date));
  return hour<11?"Selamat pagi":hour<15?"Selamat siang":hour<18?"Selamat sore":"Selamat malam";
}

