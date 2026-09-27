import type { Metadata, Viewport } from "next";
import { Archivo, Montserrat } from "next/font/google";
import { themeBootScript } from "@/lib/theme-script";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: "800",
  style: ["normal", "italic"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "hire-me-already", template: "%s · hire-me-already" },
  description: "Rehearse the interview you're actually walking into.",
  icons: {
    icon: [
      { url: "/logo/mic-icon.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/logo/mic-icon-inverse.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eadcc0" },
    { media: "(prefers-color-scheme: dark)", color: "#14120f" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
