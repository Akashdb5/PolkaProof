import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "PolkaProof",
  description: "Cloud-only proof-of-attendance powered by Polkadot signatures."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        <div className="min-h-screen bg-grid">
          <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-polka-pink text-sm font-black">
                  PP
                </span>
                PolkaProof
              </Link>
              <nav className="flex items-center gap-6 text-sm text-slate-300">
                <Link href="/#events" className="hover:text-white">
                  Events
                </Link>
                <Link href="/#how-it-works" className="hover:text-white">
                  How it works
                </Link>
                <Link href="/#organizers" className="hover:text-white">
                  Organizers
                </Link>
              </nav>
            </div>
          </header>
          <div className="mx-auto w-full max-w-6xl px-6 py-10">{children}</div>
          <footer className="border-t border-white/5 bg-slate-950/80 text-sm text-slate-400">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
              <p>© {new Date().getFullYear()} PolkaProof. Built for Polkadot communities.</p>
              <div className="flex gap-4">
                <Link href="https://polkadot.network" className="hover:text-white">
                  Polkadot
                </Link>
                <Link href="https://github.com" className="hover:text-white">
                  GitHub
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
