import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vespera — Pomodoro Zamanlayıcı",
  description:
    "TYT & YDT sınavlarına hazırlık için modern, minimalist Pomodoro zamanlayıcı. Odaklanmış çalışma oturumları ile verimli ders çalış.",
  keywords: ["pomodoro", "çalışma zamanlayıcı", "TYT", "YDT", "odak", "ders çalışma", "vespera"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vespera",
  },
  icons: {
    icon: "/icon-512.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col bg-[#0a0a0f] text-zinc-200 font-sans selection:bg-indigo-500/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
