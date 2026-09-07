import type { Metadata, Viewport } from "next";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Home Base", template: "%s · Home Base" },
  description:
    "No matter where we are, we meet here. A private place for our family.",
  applicationName: "Home Base",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Home Base", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#192f3a",
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
