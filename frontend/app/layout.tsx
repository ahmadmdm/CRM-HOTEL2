import type { Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { getRequestLanguage } from "@/lib/server-language";
import { buildAppMetadata } from "@/lib/site";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  weight: ["400", "500", "600", "700", "800"],
});

export function generateMetadata() {
  return buildAppMetadata(getRequestLanguage());
}

export const viewport: Viewport = {
  themeColor: "#ff6b4a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} min-h-screen bg-background font-sans antialiased text-foreground selection:bg-primary/20 selection:text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
