import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/domain";

export const currentProfile=cache(async()=>{const supabase=await createClient();const {data,error}=await supabase.auth.getClaims();const userId=typeof data?.claims?.sub==="string"?data.claims.sub:null;if(error||!userId)return null;const {data:profile}=await supabase.from("profiles").select("id,full_name,email,role,is_active").eq("id",userId).single();return profile as null|{id:string;full_name:string;email:string;role:UserRole;is_active:boolean};});
export async function requireRole(role:UserRole){const profile=await currentProfile();if(!profile||!profile.is_active)redirect("/login");if(profile.role!==role)redirect(profile.role==="admin"?"/admin":"/employee");return profile;}
