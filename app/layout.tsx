import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { connection } from "next/server";
import { Toaster } from "@/components/ui/sonner";
import { appIcons, appTitle, getAppEnvironment } from "@/lib/app-environment";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  // APP_ENV is a runtime variable, so read it per request rather than baking
  // the build-time value into prerendered pages.
  await connection();

  const environment = getAppEnvironment();

  return {
    title: appTitle(environment),
    description: "Notbibliotek",
    icons: appIcons(environment),
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
