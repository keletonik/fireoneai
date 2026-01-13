import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inklings - Turn Imagination into Coloring Pages",
  description:
    "Create custom printable coloring pages with AI. Describe anything and get beautiful line art ready to print and color!",
  keywords: [
    "coloring pages",
    "colouring pages",
    "AI art",
    "printable",
    "line art",
    "kids activities",
    "children",
    "creative",
  ],
  openGraph: {
    title: "Inklings - Turn Imagination into Coloring Pages",
    description: "Create custom printable coloring pages with AI!",
    type: "website",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Inklings - Turn Imagination into Coloring Pages",
    description: "Create custom printable coloring pages with AI!",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-bg-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
