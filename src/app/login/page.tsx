import { LoginForm } from "@/components/login-form";
export const metadata={title:"Masuk"};
export default function Login(){return <main className="container" style={{maxWidth:440,padding:"8vh 0"}}><div style={{textAlign:"center",marginBottom:"1.5rem"}}><div style={{fontSize:"3rem"}}>🐓</div><h1>Rocky Booth Control</h1><p style={{color:"var(--muted)"}}>Operasional booth yang tercatat dan dapat diaudit.</p></div><LoginForm/></main>}
