import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "nx-inventory",
  description:
    "A simple inventory management platform that helps businesses manage products, variants, stock, warehouses, purchases, and sales — without the complexity of a full ERP.",

  openGraph: {
    title: "nx-inventory",
    description:
      "Manage products, stock, warehouses, purchases, and sales — without the complexity of a full ERP.",
    type: "website",
    siteName: "nx-inventory",
    images: [
      {
        url: "/OG.png",
        width: 1200,
        height: 630,
        alt: "nx-inventory — Simple inventory management",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "nx-inventory",
    description:
      "Manage products, stock, warehouses, purchases, and sales — without the complexity of a full ERP.",
    images: ["/OG.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
