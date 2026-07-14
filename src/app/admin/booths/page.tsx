import {AdminCreateForm} from "@/components/admin-create-form";
import {createClient} from "@/lib/supabase/server";

export default async function Booths(){
  const {data}=await (await createClient()).from("booths").select("*").order("name");
  return <>
    <h1>Booth</h1><p>Untuk operasional sederhana, cukup aktifkan dan gunakan satu booth.</p>
    {!data?.length&&<AdminCreateForm kind="booth"><h2>Tambah booth</h2><input name="name" placeholder="Nama booth" required/><input name="address" placeholder="Alamat"/><input name="latitude" type="number" step="any" placeholder="Latitude" required/><input name="longitude" type="number" step="any" placeholder="Longitude" required/><input name="radius" type="number" defaultValue="150" min="10" required/></AdminCreateForm>}
    <div className="grid-cards">{data?.map(booth=><AdminCreateForm kind="update_booth" key={booth.id}><h2>Ubah {booth.name}</h2><input type="hidden" name="id" value={booth.id}/><label>Nama<input name="name" defaultValue={booth.name} required/></label><label>Alamat<input name="address" defaultValue={booth.address||""}/></label><label>Latitude<input name="latitude" type="number" step="any" defaultValue={booth.latitude} required/></label><label>Longitude<input name="longitude" type="number" step="any" defaultValue={booth.longitude} required/></label><label>Radius presensi (meter)<input name="radius" type="number" min="10" defaultValue={booth.attendance_radius_m} required/></label><small>{booth.is_active?"Aktif":"Nonaktif"}</small></AdminCreateForm>)}</div>
  </>;
}
