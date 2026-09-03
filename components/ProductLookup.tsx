"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { ProductDetail } from "@/components/ProductDetail";
import { ProductImage } from "@/components/ProductImage";
import { publicAsset } from "@/lib/assets";
import { getProductBySlugFromSupabase } from "@/lib/supabase/products";
import type { Product } from "@/types/product";

export function ProductLookup({ slug }: { slug?: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">(slug ? "loading" : "missing");

  useEffect(() => {
    if (!slug) {
      setStatus("missing");
      return;
    }

    let cancelled = false;
    const requestedSlug = slug;

    async function loadProduct() {
      setStatus("loading");

      try {
        const supabaseProduct = await getProductBySlugFromSupabase(requestedSlug);

        if (cancelled) {
          return;
        }

        if (!supabaseProduct) {
          setStatus("missing");
          return;
        }

        setProduct(supabaseProduct);
        setStatus("ready");
      } catch (error) {
        console.warn("Could not load product from Supabase.", error);

        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === "ready" && product) {
    return <ProductDetail product={product} />;
  }

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
        <p className="eyebrow">Detalle del disco</p>
        <h1>{getTitle(status)}</h1>
        <p>{getMessage(status)}</p>
      </section>
    </main>
  );
}

function getTitle(status: "loading" | "ready" | "missing" | "error") {
  if (status === "loading") {
    return "Cargando disco";
  }

  if (status === "error") {
    return "No se pudo cargar el disco";
  }

  return "Disco no encontrado";
}

function getMessage(status: "loading" | "ready" | "missing" | "error") {
  if (status === "loading") {
    return "Estamos consultando Supabase para mostrar la informacion actualizada.";
  }

  if (status === "error") {
    return "Revisa la conexion a Supabase o intenta nuevamente en unos segundos.";
  }

  return "El link no incluye un slug valido o el disco no esta publicado.";
}
