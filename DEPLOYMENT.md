# Deployment

## Netlify Free — rekomendasi gratis untuk MVP usaha

Pada 13-07-2026, [Netlify Pricing](https://www.netlify.com/pricing/) mencantumkan Free $0 dengan 300 kredit/bulan, deployment framework, Functions, CDN, SSL, dan basic rate limiting. Ketika limit tercapai, project dipause sampai siklus berikutnya. Konfirmasi syarat terbaru sebelum produksi.

1. Push repository ke GitHub/GitLab.
2. Netlify → Add new project → Import repository.
3. Pilih Node 24; build command `pnpm build`; publish directory dibiarkan mengikuti adapter Next.js otomatis.
4. Tambahkan seluruh env dari `.env.example`; tandai `SUPABASE_SECRET_KEY` sebagai secret.
5. Deploy, lalu salin domain HTTPS ke `NEXT_PUBLIC_APP_URL`, Supabase Site URL, dan redirect allow-list `https://DOMAIN/auth/callback`.
6. Uji login, kamera/lokasi dari ponsel, upload, signed photo, CSV, dan logout.
7. Pantau kredit. Foto disajikan dari Supabase, tetapi function compute dan web request tetap mengonsumsi alokasi Netlify.

## Vercel

Import repo, framework Next.js, Node 24, isi env, deploy, lalu atur URL Supabase seperti di atas. [Vercel Pricing](https://vercel.com/pricing) menyebut Hobby untuk personal/non-komersial; jangan gunakan Hobby untuk operasional booth komersial tanpa memastikan eligibility. Gunakan paket yang sesuai atau Netlify Free.

## Cloudflare Workers

Cloudflare Workers Free tersedia secara default dan Next.js 16 didukung melalui OpenNext. Namun aplikasi ini memakai binary Sharp untuk pemrosesan bukti; kompatibilitas dan ukuran bundle 3 MiB Free harus diuji sebelum memilih jalur ini. Jangan memindahkan watermark ke client hanya demi deployment. Referensi: [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/) dan [Next.js on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/).

## Domain

Domain bawaan host gratis sudah HTTPS dan cukup untuk kamera/PWA. Untuk domain sendiri, tambahkan domain di host, buat record DNS yang diminta, tunggu SSL aktif, kemudian ubah App URL dan redirect allow-list Supabase. Pembelian domain bukan bagian paket hosting gratis.

## Checklist rilis

- Migration/seed selesai; bucket tetap private.
- Koordinat/radius booth valid dan jadwal tersedia.
- Secret tidak tampak pada bundle atau log.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` lulus.
- Auth redirect production tepat; reset password diuji.
- Foto masuk/pulang/stok, rollback upload, signed URL, verifikasi, CSV diuji.
- Backup database dan prosedur restore terdokumentasi.
