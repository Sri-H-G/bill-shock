import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bill Shock — find help with your power bill",
  description:
    "Snap a photo of your Georgia Power bill. See why it changed and which assistance programs you may qualify for. Free, no account.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased min-h-dvh flex flex-col`}>
        <header className="border-b border-line bg-surface">
          <nav className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-brand text-brand-ink">
                ⚡
              </span>
              Bill Shock
            </Link>
            <div className="flex gap-4 text-sm font-medium text-ink-2">
              <Link href="/" className="hover:text-ink">Scan a bill</Link>
              <Link href="/premium" className="hover:text-ink">Tracker</Link>
              <Link href="/about" className="hover:text-ink">About</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-line px-4 py-6 text-center text-xs text-ink-3">
          Bill Shock shows programs that may be relevant. Each program decides who qualifies. Not affiliated with
          Georgia Power.
        </footer>
      </body>
    </html>
  );
}
