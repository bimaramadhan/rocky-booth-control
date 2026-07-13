import "server-only";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { validateImage } from "@/lib/validation";

export async function processPhoto(file:File,lines:string[]){validateImage(file,Number(process.env.MAX_PHOTO_BYTES||8_388_608));const input=Buffer.from(await file.arrayBuffer());const clean=await sharp(input,{failOn:"warning"}).rotate().resize({width:1600,height:1600,fit:"inside",withoutEnlargement:true}).webp({quality:78}).toBuffer();const meta=await sharp(clean).metadata();const width=meta.width||1200,height=meta.height||900;const safe=lines.map(x=>x.replace(/[<>&'"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c]!)));
 const bar=Math.min(height-1,48+safe.length*30);const svg=`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="${height-bar}" width="${width}" height="${bar}" fill="#000" fill-opacity=".68"/>${safe.map((s,i)=>`<text x="24" y="${height-bar+38+i*30}" font-family="Arial" font-size="22" fill="white">${s}</text>`).join("")}</svg>`;
 const watermarked=await sharp(clean).composite([{input:Buffer.from(svg),top:0,left:0}]).webp({quality:78}).toBuffer();return{original:clean,watermarked,hash:createHash("sha256").update(clean).digest("hex"),width,height,size:clean.length,mime:"image/webp"};
}
