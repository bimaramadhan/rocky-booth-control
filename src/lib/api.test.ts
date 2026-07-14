import {describe,expect,it,vi} from "vitest";
import {ApiRequestError,parseApiResponse} from "./api";

describe("parseApiResponse",()=>{
  it("membaca envelope sukses",async()=>{
    const response=new Response(JSON.stringify({success:true,data:{recordId:"abc"}}),{status:200,headers:{"content-type":"application/json"}});
    await expect(parseApiResponse<{recordId:string}>(response)).resolves.toEqual({success:true,data:{recordId:"abc"}});
  });
  it("menampilkan pesan API yang aman",async()=>{
    const response=new Response(JSON.stringify({success:false,error:{code:"UPLOAD_FAILED",message:"Foto belum berhasil diunggah."}}),{status:500,headers:{"content-type":"application/json"}});
    await expect(parseApiResponse(response)).rejects.toMatchObject({name:"ApiRequestError",code:"UPLOAD_FAILED",message:"Foto belum berhasil diunggah."});
  });
  it("tidak mencoba JSON.parse pada halaman error HTML",async()=>{
    const spy=vi.spyOn(console,"error").mockImplementation(()=>undefined);
    const response=new Response("Internal Server Error",{status:500,headers:{"content-type":"text/html"}});
    await expect(parseApiResponse(response)).rejects.toBeInstanceOf(ApiRequestError);
    expect(spy).toHaveBeenCalledWith("NON_JSON_API_RESPONSE",expect.objectContaining({status:500}));spy.mockRestore();
  });
});
