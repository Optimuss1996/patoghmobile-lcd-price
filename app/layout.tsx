import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import "./globals.css";

const iranSansX = localFont({
  src: [
    {
      path: "../public/fonts/IRANSansX-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/IRANSansX-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/IRANSansX-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/IRANSansX-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-iran-sans-x",
});

export const metadata: Metadata = {
  title: "پاتوق موبایل | قیمت LCD عمده",
  description: "لیست قیمت انواع LCD , حاتمی",
  generator: "AliSalahi",
  icons: {
    icon: [
      {
        url: "/logo-patoghmobile.png",

        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/logo-patoghmobile.png",
        media: "(prefers-color-scheme: dark)",
      },
      { url: "/logo-patoghmobile.png", type: "image/svg+xml" },
    ],
    apple: "/logo-patoghmobile.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className="bg-background">
      <body className={`${iranSansX.className} antialiased`}>
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
