import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { FcmProvider } from "@/context/FcmContext";
import EmergencyAlertBanner from "@/components/EmergencyAlertBanner";

import FaviconUpdater from "@/components/FaviconUpdater";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Managramam – Smart Digital Village Portal",
  description: "Our Village, Our Progress. Report, track, and resolve community issues efficiently with full transparency and accountability.",
  keywords: "managramam, gram panchayat, village issues, complaint management, telangana, e-governance",
  icons: {
    icon: "/logo-en.png",
    apple: "/logo-en.png",
  },
  openGraph: {
    title: "Managramam – Digital Village Portal",
    description: "Transparent village issue management system",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <LanguageProvider>
          <FaviconUpdater />
          <AuthProvider>
            <FcmProvider>
              <EmergencyAlertBanner />
              {children}
            </FcmProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

