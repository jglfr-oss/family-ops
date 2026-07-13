import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Choreo",
    template: "%s · Choreo",
  },
  description: "Chores, schedules, and streaks for the whole household.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Choreo",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1d5c46",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-16 sm:px-6">
            {children}
          </main>
          <footer className="border-line text-ink-muted border-t px-4 py-6 text-center text-xs">
            Choreo · chores in sync ·{" "}
            <a href="/privacy" className="underline">
              Privacy Policy
            </a>{" "}
            ·{" "}
            <a href="/terms" className="underline">
              Terms &amp; Conditions
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}
