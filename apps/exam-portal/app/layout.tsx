import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { getPortalBrand } from "../lib/branding";
import "./styles.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = { title: "Examination Portal | IoD-Gh", description: "Secure Institute of Directors-Ghana examinations", robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  await connection();
  const brand = await getPortalBrand();
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <header className="masthead">
          <div className="site-container masthead-inner">
            <div className="brand">
              {brand.logoUrl && <img src={brand.logoUrl} alt="" className="brand-logo" />}
              <strong>IoD<span>-Gh</span></strong>
              <span>{brand.name}</span>
            </div>
            <span className="portal-label">Examination portal</span>
          </div>
        </header>
        <main>{children}</main>
        <footer>Institute of Directors-Ghana · Examination Portal</footer>
      </body>
    </html>
  );
}
