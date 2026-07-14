export function ErrorState({message,onRetry,onBack}:{message:string;onRetry?:()=>void;onBack?:()=>void}){
  return <div className="error-state" role="alert"><div className="error-icon" aria-hidden>!</div><div><strong>Belum berhasil</strong><p>{message}</p><div className="error-actions">{onRetry&&<button type="button" className="btn btn-primary" onClick={onRetry}>Coba Lagi</button>}{onBack&&<button type="button" className="btn btn-secondary" onClick={onBack}>Kembali</button>}</div></div></div>;
}

