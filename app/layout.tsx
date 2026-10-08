import type { Metadata } from "next";
import { AuthRedirectHandler } from "@/components/AuthRedirectHandler";
import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import { ContactProvider } from "@/components/ContactProvider";
import { publicAsset } from "@/lib/assets";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ladoadiscos.com"),
  icons: {
    icon: [
      { url: publicAsset("/brand/favicon.svg"), type: "image/svg+xml" },
      { url: publicAsset("/brand/favicon-32.png"), sizes: "32x32", type: "image/png" }
    ],
    apple: [{ url: publicAsset("/brand/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }]
  },
  title: "LADO A DISCOS | Vinilos usados y nuevos",
  description: "Tienda argentina de vinilos usados y nuevos con discos probados, clasificados y listos para reservar por WhatsApp.",
  openGraph: {
    title: "LADO A DISCOS",
    description: "Vinilos usados y nuevos con fotos reales, estado informado y compra por WhatsApp.",
    type: "website",
    siteName: "LADO A DISCOS",
    locale: "es_AR",
    images: [{ url: publicAsset("/opengraph-image.png"), width: 1200, height: 630, alt: "Logo de LADO A DISCOS" }]
  },
  twitter: { card: "summary_large_image", title: "LADO A DISCOS", images: [publicAsset("/opengraph-image.png")] }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body suppressHydrationWarning>
        <AuthRedirectHandler />
        <ContactProvider>{children}</ContactProvider>
        <AnalyticsConsent />
      </body>
    </html>
  );
}
