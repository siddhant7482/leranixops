import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LearnixSai — Status & Engineering Docs",
  description:
    "Live system status and comprehensive architecture documentation for LearnixSai, the curation-first AI learning platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="logo">
              learnix<span>sai</span> <em>ops</em>
            </Link>
            <nav className="nav-links">
              <Link href="/">Status</Link>
              <Link href="/docs">Docs</Link>
              <a className="nav-cta" href="https://www.learnixsai.tech" target="_blank" rel="noreferrer">
                Open app ↗
              </a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
