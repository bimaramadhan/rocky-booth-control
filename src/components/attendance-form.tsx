"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {CameraCapture} from "@/components/camera-capture";
import {ErrorState} from "@/components/error-state";
import {parseApiResponse} from "@/lib/api";
type Location={latitude:number|null;longitude:number|null;accuracy:number|null};
type Result={recordId:string;photoPath:string;capturedAt:string;status:string};

export function AttendanceForm({canCheckOut=false}:{canCheckOut?:boolean}){
  const action=canCheckOut?"check_out":"check_in";const [file,setFile]=useState<File|null>(null);const [location,setLocation]=useState<Location>({latitude:null,longitude:null,accuracy:null});const [locationText,setLocationText]=useState("Mencari lokasi…");const [busy,setBusy]=useState(false);const [stage,setStage]=useState("");const [error,setError]=useState("");const idempotency=useRef(crypto.randomUUID());
  const locate=useCallback(()=>{setLocationText("Mencari lokasi…");if(!navigator.geolocation){setLocationText("Lokasi tidak didukung • tetap dapat dikirim");return;}navigator.geolocation.getCurrentPosition(position=>{setLocation({latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy});setLocationText(`Lokasi tersedia • akurasi ±${Math.round(position.coords.accuracy)} m`);},()=>{setLocation({latitude:null,longitude:null,accuracy:null});setLocationText("Lokasi tidak tersedia • akan diperiksa admin");},{enableHighAccuracy:true,timeout:15000,maximumAge:0});},[]);
  useEffect(()=>{const timer=window.setTimeout(locate,0);return()=>window.clearTimeout(timer)},[locate]);
  async function submit(){
    if(!file||busy)return;setBusy(true);setError("");setStage("Menyiapkan foto…");
    const body=new FormData();body.set("action",action);body.set("idempotencyKey",idempotency.current);body.set("photo",file);for(const [key,value] of Object.entries(location))if(value!==null)body.set(key,String(value));
    try{setStage("Mengunggah foto…");const response=await fetch("/api/attendance",{method:"POST",body});setStage("Menyimpan presensi…");const payload=await parseApiResponse<Result>(response);if(!payload.success)throw new Error(payload.error.message);setStage("Selesai");setTimeout(()=>window.location.assign("/employee"),700);}
    catch(value){console.error("ATTENDANCE_SUBMIT_FAILED",value);setError(value instanceof Error?value.message:"Foto belum berhasil dikirim. Periksa koneksi lalu coba lagi.");setStage("");}
    finally{setBusy(false);}
  }
  return <div className="flow-stack"><div className="location-card"><div><span className="eyebrow">Lokasi</span><strong>{locationText}</strong></div><button type="button" className="btn btn-secondary btn-small" onClick={locate}>Perbarui</button></div><CameraCapture label={action==="check_in"?"Foto Presensi Masuk":"Foto Presensi Pulang"} facing="user" guide="Posisikan wajah di dalam bingkai, pastikan area cukup terang, lalu lihat ke kamera." onPhoto={setFile}/>{stage&&<div className="progress-card" role="status"><span className="spinner" aria-hidden/><div><strong>{stage}</strong><small>Jangan tutup halaman.</small></div></div>}{error&&<ErrorState message={`${error} Foto yang sudah diambil masih tersimpan.`} onRetry={()=>void submit()}/>}<button type="button" className="btn btn-primary btn-block btn-large" disabled={!file||busy} onClick={submit}>{busy?stage:action==="check_in"?"Kirim Presensi Masuk":"Kirim Presensi Pulang"}</button><p className="helper-text">Waktu resmi dibuat saat server menerima presensi. Foto tidak dihapus jika pengiriman gagal.</p></div>;
}
