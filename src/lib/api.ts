export type ApiErrorPayload={code:string;message:string};
export type ApiResponse<T>={success:true;data:T;warning?:string|null}|{success:false;error:ApiErrorPayload};

export class ApiRequestError extends Error{
  code:string;
  status:number;
  constructor(message:string,code="REQUEST_FAILED",status=500){super(message);this.name="ApiRequestError";this.code=code;this.status=status;}
}

export async function parseApiResponse<T>(response:Response):Promise<ApiResponse<T>>{
  const contentType=response.headers.get("content-type")||"";
  if(!contentType.includes("application/json")){
    const text=(await response.text()).trim();
    console.error("NON_JSON_API_RESPONSE",{status:response.status,contentType,preview:text.slice(0,160)});
    throw new ApiRequestError("Server belum dapat memproses permintaan. Foto tetap tersimpan di perangkat; silakan coba lagi.","NON_JSON_RESPONSE",response.status);
  }
  let payload:unknown;
  try{payload=await response.json();}catch(error){console.error("INVALID_JSON_API_RESPONSE",{status:response.status,error});throw new ApiRequestError("Respons server tidak dapat dibaca. Silakan coba lagi.","INVALID_JSON_RESPONSE",response.status);}
  if(!response.ok){
    const value=payload as {error?:string|ApiErrorPayload};
    const detail=typeof value?.error==="string"?{code:"REQUEST_FAILED",message:value.error}:value?.error;
    throw new ApiRequestError(detail?.message||"Permintaan belum berhasil. Silakan coba lagi.",detail?.code||"REQUEST_FAILED",response.status);
  }
  return payload as ApiResponse<T>;
}

