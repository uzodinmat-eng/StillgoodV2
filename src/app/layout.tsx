import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CatalogProvider } from "@/components/CatalogProvider";
import { loadCatalog } from "@/lib/db/catalog";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stillgood | Abuja's Near-Expiry Grocery Rescue Marketplace",
  description:
    "Save big on near-expiry groceries from top supermarkets across Abuja, FCT. 100% verified store pickup.",
  keywords: [
    "Stillgood",
    "Abuja groceries",
    "Near expiry marketplace",
    "Discount grocery Abuja",
    "Grand Square",
    "H-Medix",
    "Next Cash and Carry",
    "Wuse II",
    "Food waste rescue Nigeria",
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const catalog = await loadCatalog();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-emerald-500 selection:text-white`}>
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <CatalogProvider catalog={catalog}>{children}</CatalogProvider>
      </body>
    </html>
  );
}
