import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const amsterdam = localFont({
  src: "../../public/amsterdam-four.ttf",
  variable: "--font-amsterdam",
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
import { ContentWrapper } from "@/components/navigation/ContentWrapper";
import { PWAProvider } from "@/components/pwa/PWAProvider";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { BirthdayLauncher } from "@/components/dashboard/BirthdayLauncher";
import { NotificationProvider } from "@/components/pwa/NotificationProvider";
import { WhatsAppBadge } from "@/components/ui/WhatsAppBadge";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${amsterdam.variable} antialiased pb-safe`}
      >

        <AuthProvider>
          <PWAProvider>
            <NotificationProvider>
              <div className="flex min-h-screen">
                <TopNavbar />
                <ContentWrapper>
                  <BirthdayLauncher />
                  <main className="flex-1">
                    {children}
                  </main>
                  <BottomNav />
                </ContentWrapper>
              </div>
              <WhatsAppBadge />
            </NotificationProvider>
          </PWAProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
