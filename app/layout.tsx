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
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  openGraph: {
    title: "Events Ledger",
    description: "Personal cultural events tracker",
    images: [{ url: "https://ledger.claireheaded.com/icon-512.png", width: 512, height: 512 }],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const guestToken = process.env.GUEST_TOKEN;
  const isGuest = !!guestToken && store.get("guest_session")?.value === guestToken;
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
