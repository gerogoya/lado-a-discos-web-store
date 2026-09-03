import type { Metadata } from "next";
import { AuthRedirectHandler } from "@/components/AuthRedirectHandler";
import "./globals.css";

export const metadata: Metadata = {
  title: "LADO A DISCOS | Vinilos usados y nuevos",
  description: "Tienda argentina de vinilos usados y nuevos con discos probados, clasificados y listos para reservar por WhatsApp.",
  openGraph: {
    title: "LADO A DISCOS",
    description: "Vinilos usados y nuevos con fotos reales, estado informado y compra por WhatsApp.",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        <AuthRedirectHandler />
        {children}
      </body>
    </html>
  );
}
