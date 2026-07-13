"use client";
import { createClient } from "@/lib/supabase/client";
export function LogoutButton(){return <button className="btn btn-secondary" onClick={async()=>{await createClient().auth.signOut();location.href="/login"}}>Keluar</button>}
