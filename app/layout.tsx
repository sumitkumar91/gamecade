import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Gamecade",
  description: "A collection of fun mini games",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50">
        <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-zinc-50 hover:text-zinc-300 transition-colors"
          >
            Gamecade
          </Link>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
          }
        `}</Script>
      </body>
    </html>
  );
}
