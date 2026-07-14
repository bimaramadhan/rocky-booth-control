import {AdminCreateForm} from "@/components/admin-create-form";
import {createClient} from "@/lib/supabase/server";

export default async function Items(){
  const {data}=await (await createClient()).from("stock_items").select("*").order("name");
  return <><h1>Master stok</h1><p>Minimum menentukan label Habis, Menipis, atau Aman pada pengecekan pekerja.</p>
    <AdminCreateForm kind="stock_item"><h2>Tambah item</h2><input name="name" placeholder="Nama item" required/><input name="unit" placeholder="Satuan" required/><input name="minimum" type="number" min="0" step=".01" defaultValue="0" required/></AdminCreateForm>
    <div className="grid-cards">{data?.map(item=><AdminCreateForm kind="update_stock_item" key={item.id}><h2>{item.name}</h2><input type="hidden" name="id" value={item.id}/><label>Nama<input name="name" defaultValue={item.name} required/></label><label>Satuan<input name="unit" defaultValue={item.unit} required/></label><label>Stok minimum<input name="minimum" type="number" min="0" step=".01" defaultValue={item.default_minimum} required/></label><small>{item.is_active?"Aktif":"Nonaktif"}</small></AdminCreateForm>)}</div>
  </>;
}
