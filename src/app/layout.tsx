import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Rocky Booth Control", template: "%s | Rocky Booth Control" },
  description: "Presensi dan kontrol stok booth Rocky Rooster",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Rocky Control", statusBarStyle: "black-translucent" }
};
export const viewport: Viewport = { themeColor: "#b42318", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><div className="shell">{children}</div></body></html>;
}
