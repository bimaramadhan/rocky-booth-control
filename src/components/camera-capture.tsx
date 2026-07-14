"use client";
import {useEffect,useRef,useState} from "react";
import {compressPhoto} from "@/lib/client-photo";

export function CameraCapture({label,onPhoto,facing="environment",guide}:{label:string;onPhoto:(file:File|null)=>void;facing?:"user"|"environment";guide?:string}){
  const video=useRef<HTMLVideoElement>(null);const [stream,setStream]=useState<MediaStream|null>(null);const [preview,setPreview]=useState("");const [error,setError]=useState("");const [preparing,setPreparing]=useState(false);
  const stop=()=>{stream?.getTracks().forEach(track=>track.stop());setStream(null)};
  useEffect(()=>()=>stream?.getTracks().forEach(track=>track.stop()),[stream]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
  async function open(){
    setError("");
    if(!navigator.mediaDevices?.getUserMedia){setError("Browser ini belum mendukung kamera langsung. Gunakan tombol kamera perangkat.");return;}
    try{const active=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing}},audio:false});setStream(active);if(video.current){video.current.srcObject=active;await video.current.play();}}
    catch{setError("Kamera tidak dapat dibuka. Periksa izin kamera lalu coba lagi.");}
  }
  async function accept(file:File){setPreparing(true);setError("");try{const compressed=await compressPhoto(file);setPreview(URL.createObjectURL(compressed));onPhoto(compressed);stop();}catch(value){setError(value instanceof Error?value.message:"Foto tidak dapat diproses.");}finally{setPreparing(false);}}
  function take(){const current=video.current;if(!current||!current.videoWidth)return;const canvas=document.createElement("canvas");canvas.width=current.videoWidth;canvas.height=current.videoHeight;canvas.getContext("2d")?.drawImage(current,0,0);canvas.toBlob(blob=>{if(blob)void accept(new File([blob],`capture-${Date.now()}.jpg`,{type:"image/jpeg"}));},"image/jpeg",.86);}
  function reset(){if(preview)URL.revokeObjectURL(preview);setPreview("");setError("");onPhoto(null);}
  const cameraName=facing==="user"?"kamera depan":"kamera belakang";
  return <section className="camera-card"><div className="camera-heading"><div><span className="eyebrow">Bukti foto</span><h3>{label}</h3></div>{preview&&<span className="status status-good">Sudah diambil</span>}</div>{guide&&<p className="camera-guide">{guide}</p>}{preview?<><img src={preview} alt={`Pratinjau ${label}`} className="camera-preview"/><button type="button" className="btn btn-secondary btn-block" onClick={reset}>Ambil Ulang</button></>:<><div className={`camera-stage ${stream?"is-live":""}`}><video ref={video} playsInline muted className={facing==="user"?"mirror-preview":""}/>{facing==="user"&&stream&&<div className="face-guide" aria-hidden/>}{!stream&&<div className="camera-placeholder"><span aria-hidden>📷</span><p>Gunakan {cameraName}</p></div>}</div>{stream?<button type="button" className="btn btn-primary btn-block" onClick={take} disabled={preparing}>{preparing?"Menyiapkan foto…":"Ambil Foto"}</button>:<button type="button" className="btn btn-primary btn-block" onClick={open}>Buka {cameraName}</button>}<label className="btn btn-secondary btn-block">Gunakan kamera perangkat<input type="file" accept="image/*" capture={facing} hidden onChange={event=>{const file=event.target.files?.[0];if(file)void accept(file);event.target.value="";}}/></label></>}{error&&<p className="inline-error">{error}</p>}<small>Foto diperkecil di perangkat agar pengiriman lebih cepat, lalu divalidasi dan diberi watermark oleh server.</small></section>;
}
