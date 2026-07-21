import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { GuestContext } from "@/components/GuestContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "Events Ledger",
  description: "Personal cultural events tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Ledger" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const isGuest = store.get("guest_session")?.value === "1";
  return (
    <html lang="en" className={`h-full ${inter.variable} ${playfair.variable}`}>
      <body className="min-h-full antialiased">
        <GuestContext value={isGuest}>
          {children}
        </GuestContext>
      </body>
    </html>
  );
}
