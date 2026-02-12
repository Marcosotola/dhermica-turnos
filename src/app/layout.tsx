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
  title: "Dhermica - Gestión de Turnos",
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
import { PWAProvider } from "@/components/pwa/PWAProvider";

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
        <PWAProvider>
          <main className="min-h-[100dvh]">
            {children}
          </main>
          <BottomNav />
        </PWAProvider>
      </body>
    </html>
  );
}
