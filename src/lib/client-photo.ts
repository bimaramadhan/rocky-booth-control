"use client";

export async function compressPhoto(file:File,{maxDimension=1280,maxBytes=760_000,quality=.82}={}){
  if(!file.type.startsWith("image/"))throw new Error("File yang dipilih bukan foto.");
  const bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});
  const scale=Math.min(1,maxDimension/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext("2d");
  if(!context)throw new Error("Foto tidak dapat diproses di perangkat ini.");
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  let current=quality,blob:Blob|null=null;
  do{blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",current));current-=.1;}while(blob&&blob.size>maxBytes&&current>=.42);
  if(!blob)throw new Error("Foto tidak dapat dikompresi.");
  return new File([blob],`photo-${Date.now()}.jpg`,{type:"image/jpeg",lastModified:Date.now()});
}

