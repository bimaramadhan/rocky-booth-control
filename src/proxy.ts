import {createServerClient} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";

export async function proxy(request:NextRequest){
  let response=NextResponse.next({request});
  try{
    const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>request.cookies.getAll(),setAll(values){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
    await supabase.auth.getUser();
  }catch(error){console.error("AUTH_PROXY_REFRESH_FAILED",{path:request.nextUrl.pathname,error:error instanceof Error?error.message:String(error)});}
  response.headers.set("Cache-Control","private, no-store");return response;
}

// Route API menangani autentikasi dan error-nya sendiri. Mengecualikan /api juga
// mencegah proxy serverless menyentuh body multipart foto sebelum route handler.
export const config={matcher:["/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|icon.svg|sw.js).*)"]};
