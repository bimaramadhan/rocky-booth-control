"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useState} from "react";
import {LogoutButton} from "@/components/logout-button";

const groups=[
  {label:"Operasional",links:[
    {href:"/admin",label:"Ringkasan",icon:"home"},
    {href:"/admin/attendance",label:"Presensi",icon:"attendance"},
    {href:"/admin/stock-checks",label:"Cek stok",icon:"stock"},
  ]},
  {label:"Data utama",links:[
    {href:"/admin/employees",label:"Pekerja",icon:"users"},
    {href:"/admin/booths",label:"Booth",icon:"booth"},
    {href:"/admin/shifts",label:"Shift kerja",icon:"clock"},
    {href:"/admin/stock-items",label:"Item stok",icon:"box"},
  ]},
  {label:"Sistem",links:[
    {href:"/admin/reports",label:"Laporan",icon:"report"},
    {href:"/admin/audit-logs",label:"Audit log",icon:"audit"},
    {href:"/admin/settings",label:"Pengaturan",icon:"settings"},
  ]},
];

const icons:Record<string,React.ReactNode>={
  home:<><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/></>,
  attendance:<><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6"/></>,
  stock:<><path d="M4 7h16v13H4zM7 4h10l3 3H4zM9 12h6M9 16h4"/></>,
  users:<><circle cx="9" cy="8" r="3"/><path d="M3 20c.4-4 2.3-6 6-6s5.6 2 6 6M16 5.5a3 3 0 0 1 0 5.5M17 14c2.5.5 3.7 2.4 4 6"/></>,
  booth:<><path d="M4 9h16v11H4zM3 9l2-5h14l2 5M8 20v-6h8v6"/><path d="M3 9c0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  box:<><path d="m4 7 8-4 8 4-8 4zM4 7v10l8 4 8-4V7M12 11v10"/></>,
  report:<><path d="M6 3h9l4 4v14H6zM15 3v5h4M9 13h7M9 17h7M9 9h2"/></>,
  audit:<><path d="M5 4h14v17H5zM9 4V2h6v2M9 9h6M9 13h6M9 17h4"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
};

export function AdminSidebar({fullName}:{fullName:string}){
  const pathname=usePathname();
  const [open,setOpen]=useState(false);
  const initials=fullName.split(" ").map(word=>word[0]).join("").slice(0,2).toUpperCase();
  return <aside className={`admin-sidebar ${open?"is-open":""}`}>
    <div className="admin-brand"><span className="admin-brand-mark">R</span><div><strong>Rocky Control</strong><small>Panel Administrator</small></div><button type="button" className="admin-menu-toggle" aria-label="Buka atau tutup menu" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><span/><span/><span/></button></div>
    <div className="admin-sidebar-body">
      <div className="admin-user"><span>{initials}</span><div><strong>{fullName}</strong><small>Administrator</small></div></div>
      <nav className="admin-nav" aria-label="Navigasi admin">{groups.map(group=><div className="admin-nav-group" key={group.label}><small>{group.label}</small>{group.links.map(link=>{const active=link.href==="/admin"?pathname===link.href:pathname.startsWith(link.href);return <Link key={link.href} href={link.href} prefetch className={active?"active":""} aria-current={active?"page":undefined} onClick={()=>setOpen(false)}><svg viewBox="0 0 24 24" aria-hidden>{icons[link.icon]}</svg><span>{link.label}</span>{active&&<i/>}</Link>})}</div>)}</nav>
      <div className="admin-sidebar-footer"><LogoutButton/></div>
    </div>
  </aside>;
}
