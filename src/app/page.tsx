import { currentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
export default async function Home(){const profile=await currentProfile();redirect(!profile?"/login":profile.role==="admin"?"/admin":"/employee");}
