import {requireRole} from "@/lib/auth";import {AdminSidebar} from "@/components/admin-sidebar";
export const dynamic="force-dynamic";
export default async function AdminLayout({children}:{children:React.ReactNode}){const profile=await requireRole("admin");return <div className="admin-layout"><AdminSidebar fullName={profile.full_name}/><main className="admin-main"><div className="admin-content">{children}</div></main></div>}
