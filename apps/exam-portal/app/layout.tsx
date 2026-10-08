import type { Metadata } from "next";
import { connection } from "next/server";
import "./styles.css";

export const metadata: Metadata = { title: "Examination Portal | IoD-Gh", description: "Secure Institute of Directors-Ghana examinations", robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  await connection();
  return <html lang="en"><body><header className="masthead"><div className="brand"><strong>IoD<span>-Gh</span></strong><span>Institute of Directors-Ghana</span></div><span className="portal-label">EXAMINATION PORTAL</span></header><main>{children}</main><footer>Institute of Directors-Ghana · Examination Portal</footer></body></html>;
}
