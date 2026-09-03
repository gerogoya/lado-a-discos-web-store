"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { ProductImage } from "@/components/ProductImage";
import { publicAsset } from "@/lib/assets";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function NotFound() {
  useEffect(() => {
    const pathWithoutBase = basePath && window.location.pathname.startsWith(basePath)
      ? window.location.pathname.slice(basePath.length)
      : window.location.pathname;
    const productSlug = pathWithoutBase.match(/^\/producto\/([^/]+)\/?$/)?.[1];

    if (productSlug) {
      window.location.replace(`${basePath}/producto/?slug=${encodeURIComponent(productSlug)}`);
    }
  }, []);

  return (
    <main className="site-shell product-page">
      <header className="topbar compact">
        <Link className="brand" href="/">
          <ProductImage src={publicAsset("/brand/lado-a-discos-logo.jpg")} alt="LADO A DISCOS" width={52} height={52} priority />
          <span>LADO A DISCOS</span>
        </Link>
        <Link className="back-link" href="/">
          <ArrowLeft size={18} />
          Volver al catalogo
        </Link>
      </header>

      <section className="product-lookup-state">
        <p className="eyebrow">Pagina no encontrada</p>
        <h1>No encontramos este link</h1>
        <p>Volver al catalogo para buscar el disco publicado.</p>
      </section>
    </main>
  );
}
