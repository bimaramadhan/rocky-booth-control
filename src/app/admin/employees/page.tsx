import {AdminCreateForm} from "@/components/admin-create-form";
import {createClient} from "@/lib/supabase/server";

export default async function Employees(){
  const sb=await createClient();const [{data:users},{data:booths}]=await Promise.all([sb.from("profiles").select("id,full_name,email,phone,is_active,employee_booth_assignments(booths(name))").eq("role","employee").order("full_name"),sb.from("booths").select("id,name").eq("is_active",true)]);
  return <><h1>Pekerja</h1><p>Akun dibuat oleh admin. Jadwal harian tidak wajib pada mode satu booth.</p>
    <AdminCreateForm kind="employee"><h2>Tambah pekerja</h2><div className="field"><label>Nama</label><input name="full_name" required/></div><div className="field"><label>Email</label><input name="email" type="email" required/></div><div className="field"><label>Kata sandi awal</label><input name="password" type="password" minLength={8} required/></div><div className="field"><label>Booth</label><select name="booth_id">{booths?.map(booth=><option value={booth.id} key={booth.id}>{booth.name}</option>)}</select></div></AdminCreateForm>
    <div className="grid-cards">{users?.map(user=><AdminCreateForm kind="update_employee" key={user.id}><h2>{user.full_name}</h2><input type="hidden" name="id" value={user.id}/><label>Nama<input name="full_name" defaultValue={user.full_name} required/></label><label>Telepon<input name="phone" defaultValue={user.phone||""}/></label><label>Status<select name="is_active" defaultValue={String(user.is_active)}><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label><small>{user.email} · {(user.employee_booth_assignments as unknown as {booths:{name:string}}[])?.map(item=>item.booths?.name).join(", ")||"Booth aktif otomatis"}</small></AdminCreateForm>)}</div>
  </>;
}
