import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getSettings } from "@/lib/data";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: `${settings.business_name} — Book an appointment`,
    description: "Book your next appointment online in seconds.",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">
                {settings.business_name.charAt(0)}
              </span>
              {settings.business_name}
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="text-slate-600 hover:text-slate-900">
                Services
              </Link>
              <Link href="/admin" className="text-slate-600 hover:text-slate-900">
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          {settings.business_name} · Online booking
        </footer>
      </body>
    </html>
  );
}
