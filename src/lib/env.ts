import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000")
});
const serverSchema = publicSchema.extend({
  SUPABASE_SECRET_KEY: z.string().min(10),
  MAX_PHOTO_BYTES: z.coerce.number().int().positive().default(8_388_608),
  RATE_LIMIT_SECONDS: z.coerce.number().int().min(1).default(10)
});
export function publicEnv() { return publicSchema.parse(process.env); }
export function serverEnv() { return serverSchema.parse(process.env); }
