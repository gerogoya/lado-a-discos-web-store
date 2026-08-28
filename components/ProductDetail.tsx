"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MessageCircle, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { publicAsset } from "@/lib/assets";
import { buildWhatsAppUrl, storeConfig } from "@/lib/store-config";
import { formatCurrency } from "@/lib/format";
import type { Product, ProductStatus } from "@/types/product";

type CartItem = {
  productId: string;
  quantity: number;
};

export function ProductDetail({ product }: { product: Product }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [status, setStatus] = useState<ProductStatus>(product.status);

  useEffect(() => {
    const savedCart = window.localStorage.getItem(storeConfig.cartStorageKey);
    const savedInventory = window.localStorage.getItem(storeConfig.inventoryStorageKey);

    if (savedCart) {
      setCart(JSON.parse(savedCart) as CartItem[]);
    }

    if (savedInventory) {
      const inventory = JSON.parse(savedInventory) as Record<string, ProductStatus>;
      setStatus(inventory[product.id] ?? product.status);
    }
  }, [product.id, product.status]);

  useEffect(() => {
    window.localStorage.setItem(storeConfig.cartStorageKey, JSON.stringify(cart));
  }, [cart]);

  const isInCart = cart.some((item) => item.productId === product.id);
  const isUnavailable = status === "reserved" || status === "sold";
  const whatsappUrl = useMemo(() => {
    return buildWhatsAppUrl(
      [
        "Hola LADO A DISCOS, quiero consultar por este disco:",
        "",
        `${product.artist} - ${product.title}`,
        `Precio: ${formatCurrency(product.price)}`,
        `Estado: disco ${product.mediaCondition}, tapa ${product.sleeveCondition}`,
        `Link/producto: ${product.slug}`
      ].join("\n")
    );
  }, [product]);

  function addToCart() {
    setCart((currentCart) => {
      if (currentCart.some((item) => item.productId === product.id)) {
        return currentCart;
      }

      return [...currentCart, { productId: product.id, quantity: 1 }];
    });
  }

  return (
    <main className="site-shell product-page">
      <header className="topbar compact">
        <Link className="brand" href="/">
          <Image src={publicAsset("/brand/lado-a-discos-logo.jpg")} alt="LADO A DISCOS" width={52} height={52} priority />
          <span>LADO A DISCOS</span>
        </Link>
        <Link className="back-link" href="/">
          <ArrowLeft size={18} />
          Volver al catalogo
        </Link>
      </header>

      <section className="product-detail-grid">
        <div className="detail-gallery">
          {product.photos.map((photo) => (
            <Image key={photo} src={photo} alt={`${product.artist} - ${product.title}`} width={900} height={900} priority />
          ))}
        </div>

        <div className="detail-info">
          <p className="eyebrow">{product.genre} · {product.country} · {product.year}</p>
          <h1>{product.title}</h1>
          <p className="detail-artist">{product.artist}</p>
          <strong className="detail-price">{formatCurrency(product.price)}</strong>

          <div className="detail-status-grid">
            <span>Disco <strong>{product.mediaCondition}</strong></span>
            <span>Tapa <strong>{product.sleeveCondition}</strong></span>
            <span>Stock <strong>{product.stock}</strong></span>
            <span>Estado <strong>{statusLabel(status)}</strong></span>
          </div>

          <p className="detail-copy">
            Publicacion mock creada desde foto local. En el backend real este espacio mostrara descripcion,
            notas de condicion, sello, numero de catalogo y detalles de reproduccion.
          </p>

          <div className="detail-actions">
            <button className="primary-action" type="button" disabled={isUnavailable || isInCart} onClick={addToCart}>
              <ShoppingBag size={18} />
              {isUnavailable ? "No disponible" : isInCart ? "En carrito" : "Agregar al carrito"}
            </button>
            <a className="secondary-action" href={whatsappUrl} target="_blank">
              <MessageCircle size={18} />
              Consultar
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function statusLabel(status: ProductStatus) {
  const labels: Record<ProductStatus, string> = {
    published: "Disponible",
    reserved: "Reservado",
    sold: "Vendido",
    draft: "Borrador"
  };

  return labels[status];
}
