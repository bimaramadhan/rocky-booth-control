"use client";
import {createClient} from "@/lib/supabase/client";
export function LogoutButton(){return <button className="btn btn-secondary btn-block" onClick={async()=>{if(!window.confirm("Keluar dari aplikasi sekarang?"))return;await createClient().auth.signOut();window.location.assign("/login")}}>Keluar dari Aplikasi</button>}
