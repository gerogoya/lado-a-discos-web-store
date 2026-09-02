"use client";

import Link from "next/link";
import { MessageCircle, Minus, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { publicAsset } from "@/lib/assets";
import { buildClientProducts, isCustomProduct, readLegacyInventory, readProductOverrides } from "@/lib/product-storage";
import { buildWhatsAppUrl, storeConfig } from "@/lib/store-config";
import { formatCurrency } from "@/lib/format";
import { products } from "@/lib/products";
import type { Product, ProductCurrency, ProductStatus } from "@/types/product";

type CartItem = {
  productId: string;
  quantity: number;
};

export function Storefront() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("Todos");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(products);

  useEffect(() => {
    const savedCart = window.localStorage.getItem(storeConfig.cartStorageKey);

    if (savedCart) {
      setCart(JSON.parse(savedCart) as CartItem[]);
    }

    setCatalogProducts(buildClientProducts(readProductOverrides(), readLegacyInventory()));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storeConfig.cartStorageKey, JSON.stringify(cart));
  }, [cart]);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return catalogProducts
      .filter((product) => product.status !== "draft")
      .filter((product) => genre === "Todos" || product.genre === genre)
      .filter((product) => {
        if (!normalizedQuery) {
          return true;
        }

        return [product.artist, product.title, product.album, product.genre, product.country, product.year.toString()]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      });
  }, [catalogProducts, genre, query]);

  const genresForCatalog = useMemo(() => {
    return Array.from(new Set(catalogProducts.map((product) => product.genre).filter(Boolean))).sort();
  }, [catalogProducts]);

  const featuredProduct = visibleProducts.find((product) => product.featured) ?? visibleProducts[0];
  const cartProducts = cart
    .map((item) => {
      const product = catalogProducts.find((candidate) => candidate.id === item.productId);
      return product ? { ...product, quantity: item.quantity } : null;
    })
    .filter(Boolean) as Array<Product & { quantity: number }>;
  const cartTotalLabel = formatTotals(cartProducts);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  function addToCart(product: Product) {
    setCart((currentCart) => {
      if (currentCart.some((item) => item.productId === product.id)) {
        return currentCart;
      }

      return [...currentCart, { productId: product.id, quantity: 1 }];
    });
    setCartOpen(true);
  }

  function removeFromCart(productId: string) {
    setCart((currentCart) => currentCart.filter((item) => item.productId !== productId));
  }

  function buildOrderMessage() {
    const lines = cartProducts.map(
      (item) =>
        `- ${item.artist} - ${item.title} (${item.mediaCondition}/${item.sleeveCondition}) x${item.quantity}: ${formatCurrency(
          item.price * item.quantity,
          item.currency
        )}`
    );

    return [
      "Hola LADO A DISCOS, quiero consultar por este pedido:",
      "",
      ...lines,
      "",
      `Total estimado: ${cartTotalLabel}`,
      "",
      "Me pasas disponibilidad final y opciones de envio/retiro?"
    ].join("\n");
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Ir al inicio">
          <ProductImage src={publicAsset("/brand/lado-a-discos-logo.jpg")} alt="LADO A DISCOS" width={56} height={56} priority />
          <span>LADO A DISCOS</span>
        </Link>

        <nav className="nav-links" aria-label="Navegacion principal">
          <a href="#catalogo">Catalogo</a>
          <a href="#clasificacion">Estado</a>
          <Link href="/admin">Admin</Link>
        </nav>

        <button className="icon-button cart-button" type="button" onClick={() => setCartOpen(true)} aria-label="Abrir carrito">
          <ShoppingBag size={20} />
          <span>{cartCount}</span>
        </button>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Vinilos usados y nuevos · Argentina</p>
          <h1>Discos con historia, fotos reales y estado informado.</h1>
          <p>
            Catalogo inicial de LPs de 12 pulgadas. Cada pieza se publica con stock unitario, estado del disco,
            estado de tapa y pedido directo por WhatsApp.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#catalogo">
              Ver catalogo
            </a>
            <a className="secondary-action" href="#clasificacion">
              Como clasificamos
            </a>
          </div>
        </div>

        {featuredProduct && !isCustomProduct(featuredProduct.id) ? (
          <Link className="featured-record" href={`/producto/${featuredProduct.slug}`}>
            <span className="record-label">Nuevo ingreso</span>
            <ProductImage
              src={featuredProduct.photos[0]}
              alt={`${featuredProduct.artist} - ${featuredProduct.title}`}
              width={780}
              height={780}
              priority
            />
            <div>
              <strong>{featuredProduct.title}</strong>
              <span>{formatCurrency(featuredProduct.price, featuredProduct.currency)}</span>
            </div>
          </Link>
        ) : featuredProduct ? (
          <div className="featured-record">
            <span className="record-label">Nuevo ingreso</span>
            <ProductImage
              src={featuredProduct.photos[0]}
              alt={`${featuredProduct.artist} - ${featuredProduct.title}`}
              width={780}
              height={780}
              priority
            />
            <div>
              <strong>{featuredProduct.title}</strong>
              <span>{formatCurrency(featuredProduct.price, featuredProduct.currency)}</span>
            </div>
          </div>
        ) : null}
      </section>

      <section className="trust-strip" aria-label="Informacion de compra">
        <span>Stock real por unidad</span>
        <span>Pedido por WhatsApp</span>
        <span>Usados clasificados</span>
        <span>Listo para escalar a backend</span>
      </section>

      <section className="catalog-layout" id="catalogo">
        <aside className="filters-panel">
          <div className="panel-heading">
            <SlidersHorizontal size={18} />
            <span>Filtros</span>
          </div>

          <label className="search-field">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar artista, titulo, genero..." />
          </label>

          <div className="filter-stack">
            <span className="filter-label">Genero</span>
            <div className="genre-grid">
              {["Todos", ...genresForCatalog].map((item) => (
                <button className={genre === item ? "chip active" : "chip"} type="button" key={item} onClick={() => setGenre(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="catalog-content">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Catalogo inicial</p>
              <h2>{visibleProducts.length} discos publicados</h2>
            </div>
            <span>Mock desde tus fotos locales</span>
          </div>

          <div className="product-grid">
            {visibleProducts.map((product) => {
              const productStatus = product.status;
              const isUnavailable = productStatus === "reserved" || productStatus === "sold";
              const isInCart = cart.some((item) => item.productId === product.id);
              const imageContent = (
                <>
                  <ProductImage
                    src={product.photos[0]}
                    alt={`${product.artist} - ${product.title}`}
                    width={520}
                    height={520}
                    loading="lazy"
                  />
                  <span className={`status-badge ${productStatus}`}>{getStatusLabel(productStatus)}</span>
                </>
              );

              return (
                <article className="product-card" key={product.id}>
                  {isCustomProduct(product.id) ? (
                    <div className="product-image-link disabled-detail" aria-label={`Vista previa de ${product.title}`}>
                      {imageContent}
                    </div>
                  ) : (
                    <Link className="product-image-link" href={`/producto/${product.slug}`} aria-label={`Ver ${product.title}`}>
                      {imageContent}
                    </Link>
                  )}
                  <div className="product-card-body">
                    <div>
                      <p>{product.artist}</p>
                      <h3>{product.title}</h3>
                    </div>
                    <div className="product-meta">
                      <span>{product.album}</span>
                      <span>{product.genre}</span>
                      <span>{product.year}</span>
                      <span>{product.country}</span>
                    </div>
                    <div className="condition-row">
                      <span>Disco {product.mediaCondition}</span>
                      <span>Tapa {product.sleeveCondition}</span>
                    </div>
                    <div className="product-purchase-row">
                      <strong>{formatCurrency(product.price, product.currency)}</strong>
                      <button
                        className="small-buy"
                        type="button"
                        disabled={isUnavailable || isInCart}
                        onClick={() => addToCart(product)}
                      >
                        {isUnavailable ? "No disponible" : isInCart ? "En carrito" : "Agregar"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="info-section" id="clasificacion">
        <div>
          <p className="eyebrow">Estado del producto</p>
          <h2>Disco y tapa se informan por separado.</h2>
        </div>
        <p>
          El esqueleto ya contempla una escala simple para usados: M, NM, EX, VG+, VG y G. En la proxima etapa se puede
          agregar una pagina dedicada con criterios de clasificacion, limpieza, prueba de escucha y garantia.
        </p>
      </section>

      <CartDrawer
        open={cartOpen}
        products={cartProducts}
        total={cartTotalLabel}
        onClose={() => setCartOpen(false)}
        onRemove={removeFromCart}
        orderUrl={buildWhatsAppUrl(buildOrderMessage())}
      />
    </main>
  );
}

function formatTotals(products: Array<Product & { quantity: number }>) {
  const totals = products.reduce<Record<ProductCurrency, number>>(
    (currentTotals, product) => ({
      ...currentTotals,
      [product.currency]: currentTotals[product.currency] + product.price * product.quantity
    }),
    { ARS: 0, USD: 0 }
  );

  return (Object.entries(totals) as Array<[ProductCurrency, number]>)
    .filter(([, total]) => total > 0)
    .map(([currency, total]) => formatCurrency(total, currency))
    .join(" + ");
}

function getStatusLabel(status: ProductStatus) {
  const labels: Record<ProductStatus, string> = {
    published: "Disponible",
    reserved: "Reservado",
    sold: "Vendido",
    draft: "Borrador"
  };

  return labels[status];
}

function CartDrawer({
  open,
  products,
  total,
  onClose,
  onRemove,
  orderUrl
}: {
  open: boolean;
  products: Array<Product & { quantity: number }>;
  total: string;
  onClose: () => void;
  onRemove: (productId: string) => void;
  orderUrl: string;
}) {
  return (
    <aside className={open ? "cart-drawer open" : "cart-drawer"} aria-hidden={!open}>
      <div className="cart-header">
        <div>
          <p className="eyebrow">Pedido</p>
          <h2>Carrito</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar carrito">
          <X size={20} />
        </button>
      </div>

      <div className="cart-items">
        {products.length === 0 ? (
          <p className="empty-cart">Todavia no agregaste discos.</p>
        ) : (
          products.map((product) => (
            <div className="cart-item" key={product.id}>
              <ProductImage src={product.photos[0]} alt={product.title} width={76} height={76} />
              <div>
                <strong>{product.title}</strong>
                <span>{formatCurrency(product.price, product.currency)}</span>
                <small>
                  {product.mediaCondition}/{product.sleeveCondition}
                </small>
              </div>
              <button className="remove-button" type="button" onClick={() => onRemove(product.id)} aria-label={`Quitar ${product.title}`}>
                <Minus size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="cart-footer">
        <div className="cart-total">
          <span>Total estimado</span>
          <strong>{total || "-"}</strong>
        </div>
        <a className={products.length ? "whatsapp-action" : "whatsapp-action disabled"} href={products.length ? orderUrl : undefined} target="_blank">
          <MessageCircle size={18} />
          Pedir por WhatsApp
        </a>
      </div>
    </aside>
  );
}
