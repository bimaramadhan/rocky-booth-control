import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { PwaRegister } from "@/components/pwa-register";
export const dynamic="force-dynamic";
export default async function EmployeeLayout({children}:{children:React.ReactNode}){const p=await requireRole("employee");return <><PwaRegister/><header style={{background:"#fff",borderBottom:"1px solid #e5dfd3",padding:".8rem 0"}}><div className="container" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><strong>Rocky Booth Control</strong><small style={{display:"block",color:"var(--muted)"}}>{p.full_name}</small></div><LogoutButton/></div></header><main className="employee-main container">{children}</main><nav className="bottom-nav"><Link href="/employee">Beranda</Link><Link href="/employee/attendance">Presensi</Link><Link href="/employee/stock-check">Cek Stok</Link><Link href="/employee/history">Riwayat</Link><Link href="/employee/profile">Profil</Link></nav></>}
