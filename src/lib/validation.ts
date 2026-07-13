import { z } from "zod";
export const uuid=z.uuid();
export const locationSchema=z.object({latitude:z.number().min(-90).max(90).nullable(),longitude:z.number().min(-180).max(180).nullable(),accuracy:z.number().min(0).max(100_000).nullable()}).refine(v=>(v.latitude===null)===(v.longitude===null),"Koordinat harus lengkap");
export const attendanceUploadSchema=z.object({action:z.enum(["check_in","check_out"]),idempotencyKey:z.string().min(16).max(100),latitude:z.coerce.number().min(-90).max(90).nullable(),longitude:z.coerce.number().min(-180).max(180).nullable(),accuracy:z.coerce.number().min(0).max(100_000).nullable()});
export const stockDetailSchema=z.object({stockItemId:uuid,opening:z.number().nonnegative(),incoming:z.number().nonnegative(),usage:z.number().nonnegative(),physical:z.number().nonnegative(),note:z.string().trim().max(500).optional()});
export const verificationSchema=z.object({recordType:z.enum(["attendance","stock_check"]),recordId:uuid,status:z.enum(["verified","needs_review","rejected"]),note:z.string().trim().max(1000)});
export function validateImage(file:File,max=8_388_608){if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("Format foto harus JPEG, PNG, atau WebP");if(file.size<=0||file.size>max)throw new Error("Ukuran foto tidak valid");return true;}
