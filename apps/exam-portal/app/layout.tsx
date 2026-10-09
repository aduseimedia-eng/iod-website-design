import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import "./styles.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = { title: "Examination Portal | IoD-Gh", description: "Secure Institute of Directors-Ghana examinations", robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  await connection();
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <header className="masthead">
          <div className="site-container masthead-inner">
            <div className="brand">
              <span>Institute of Directors-Ghana</span>
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
