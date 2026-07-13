import { createClient } from "@supabase/supabase-js";
const {NEXT_PUBLIC_SUPABASE_URL:url,SUPABASE_SECRET_KEY:key,DEMO_ADMIN_EMAIL,DEMO_ADMIN_PASSWORD,DEMO_EMPLOYEE_EMAIL,DEMO_EMPLOYEE_PASSWORD}=process.env;
if(!url||!key||!DEMO_ADMIN_PASSWORD||!DEMO_EMPLOYEE_PASSWORD)throw new Error("Lengkapi env Supabase dan password demo (jangan commit password).");
const supabase=createClient(url,key,{auth:{persistSession:false}});
for(const u of [{email:DEMO_ADMIN_EMAIL,password:DEMO_ADMIN_PASSWORD,name:"Admin Rocky",role:"admin"},{email:DEMO_EMPLOYEE_EMAIL,password:DEMO_EMPLOYEE_PASSWORD,name:"Pekerja Demo",role:"employee"}]){
 const {data,error}=await supabase.auth.admin.createUser({email:u.email,password:u.password,email_confirm:true});if(error&&!error.message.includes("already"))throw error;
 const id=data.user?.id;if(id)await supabase.from("profiles").upsert({id,email:u.email,full_name:u.name,role:u.role});
 if(id&&u.role==="employee")await supabase.from("employee_booth_assignments").upsert({employee_id:id,booth_id:"10000000-0000-4000-8000-000000000001",starts_on:new Date().toISOString().slice(0,10),is_active:true},{onConflict:"employee_id,booth_id,starts_on"});
}
console.log("Akun demo dibuat. Buat employee_schedules untuk tanggal kerja melalui dashboard/SQL.");
