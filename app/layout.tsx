import type { Metadata, Viewport } from "next";
import "./globals.css";

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
      <body className="antialiased font-body">{children}</body>
    </html>
  );
}
