import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Dhermica Estética Unisex",
  description: "Sistema de gestión de turnos para Dhermica",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dhermica",
  },
  formatDetection: {
    telephone: false,
  },
};

import { BottomNav } from "@/components/navigation/BottomNav";
import { TopNavbar } from "@/components/navigation/TopNavbar";
import { PWAProvider } from "@/components/pwa/PWAProvider";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { BirthdayLauncher } from "@/components/dashboard/BirthdayLauncher";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pb-safe`}
      >
        <AuthProvider>
          <PWAProvider>
            <TopNavbar />
            <BirthdayLauncher />
            <main className="min-h-[100dvh]">
              {children}
            </main>
            <BottomNav />
          </PWAProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
