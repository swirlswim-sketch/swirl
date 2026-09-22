import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppChrome from "@/components/layout/AppChrome";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "Swirl",
  description: "Swim real-world routes. Track every metre.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0057FF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-body">
        <PwaRegister />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
