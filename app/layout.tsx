import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learnix — Status & Docs",
  description: "Live system status and architecture documentation for Learnix.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="wrap">
          <nav className="nav">
            <Link href="/" className="logo">learnix<span>sai</span> ops</Link>
            <div className="nav-links">
              <Link href="/">Status</Link>
              <Link href="/docs">Docs</Link>
              <a href="https://www.learnixsai.tech" target="_blank" rel="noreferrer">App ↗</a>
            </div>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
