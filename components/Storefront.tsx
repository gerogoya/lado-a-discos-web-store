"use client";

import Link from "next/link";
import { ArrowUp, ChevronLeft, ChevronRight, MessageCircle, Minus, Pause, Play, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { SimpleRichText, contentHref, isSafeContentHref } from "@/components/SimpleRichText";
import { publicAsset } from "@/lib/assets";
import { buildClientProducts, isCustomProduct, readLegacyInventory, readProductOverrides } from "@/lib/product-storage";
import { buildWhatsAppUrl, storeConfig } from "@/lib/store-config";
import { formatCurrency } from "@/lib/format";
import { products } from "@/lib/products";
import { listProductsFromSupabase } from "@/lib/supabase/products";
import { getHomepage } from "@/lib/supabase/homepage";
import { defaultHomepageContent, type HomepageContent, type HomepageSection } from "@/types/homepage";
import type { Product, ProductCurrency, ProductStatus } from "@/types/product";

const staticProductSlugs = new Set(products.map((product) => product.slug));

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
  const [catalogSource, setCatalogSource] = useState("Catalogo local");
  const [homepageContent, setHomepageContent] = useState<HomepageContent>(defaultHomepageContent);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [carouselInteracting, setCarouselInteracting] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const savedCart = window.localStorage.getItem(storeConfig.cartStorageKey);
    const localProducts = buildClientProducts(readProductOverrides(), readLegacyInventory());

    if (savedCart) {
      setCart(JSON.parse(savedCart) as CartItem[]);
    }

    setCatalogProducts(localProducts);

    async function loadSupabaseProducts() {
      try {
        const supabaseProducts = await listProductsFromSupabase();

        if (!cancelled) {
          setCatalogProducts(supabaseProducts);
          setCatalogSource("Supabase local");
        }
      } catch (error) {
        console.warn("Using local catalog fallback.", error);
      }
    }

    loadSupabaseProducts();
    void getHomepage().then(homepage => {
      if (!cancelled) {
        setHomepageContent(homepage.content);
        setHomepageSections(homepage.sections);
      }
    }).catch(error => console.warn("Using default homepage content.", error));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storeConfig.cartStorageKey, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const updateBackToTop = () => setShowBackToTop(window.scrollY > 500);
    updateBackToTop();
    window.addEventListener("scroll", updateBackToTop, { passive: true });
    return () => window.removeEventListener("scroll", updateBackToTop);
  }, []);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return catalogProducts
      .filter((product) => product.status !== "draft")
      .filter((product) => genre === "Todos" || product.genre === genre)
      .filter((product) => {
        if (!normalizedQuery) {
          return true;
        }

        return [product.artist, product.title, product.genre, product.country, product.year?.toString(), product.label, product.format]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      });
  }, [catalogProducts, genre, query]);

  const genresForCatalog = useMemo(() => {
    return Array.from(new Set(catalogProducts.map((product) => product.genre).filter(Boolean))).sort();
  }, [catalogProducts]);

  const featuredProducts = useMemo(() => {
    const publishedProducts = catalogProducts.filter(product => product.status !== "draft");
    const selected = publishedProducts.filter(product => product.featured)
      .sort((first, second) => (first.featuredOrder ?? 99) - (second.featuredOrder ?? 99) || first.id.localeCompare(second.id))
      .slice(0, 5);
    return selected.length ? selected : publishedProducts.slice(0, 1);
  }, [catalogProducts]);
  const featuredProduct = featuredProducts[featuredIndex % Math.max(featuredProducts.length, 1)];

  useEffect(() => {
    setFeaturedIndex(current => featuredProducts.length ? current % featuredProducts.length : 0);
  }, [featuredProducts.length]);

  useEffect(() => {
    if (featuredProducts.length < 2 || carouselPaused || carouselInteracting) return;
    const interval = window.setInterval(() => {
      setFeaturedIndex(current => (current + 1) % featuredProducts.length);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [carouselInteracting, carouselPaused, featuredProducts.length]);
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
    <main className="site-shell" id="inicio">
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
          <p className="eyebrow">{homepageContent.eyebrow}</p>
          <h1>{homepageContent.heading}</h1>
          <SimpleRichText value={homepageContent.body} />
          <div className="hero-actions">
            {homepageContent.actions.filter(action => action.visible && isSafeContentHref(action.href)).map(action =>
              <a key={action.id} className={action.id === "primary" ? "primary-action" : "secondary-action"} href={contentHref(action.href)}>{action.label}</a>
            )}
          </div>
        </div>

        {featuredProduct && <div className="featured-carousel" role="region" aria-label="Discos destacados"
          onMouseEnter={() => setCarouselInteracting(true)} onMouseLeave={() => setCarouselInteracting(false)}
          onFocusCapture={() => setCarouselInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setCarouselInteracting(false); }}>
          <Link className="featured-record" href={getProductDetailHref(featuredProduct)} key={featuredProduct.id}>
            <span className="record-label">Destacado {featuredIndex + 1} de {featuredProducts.length}</span>
            <ProductImage src={featuredProduct.photos[0]} alt={`${featuredProduct.artist} - ${featuredProduct.title}`} width={780} height={780} priority />
            <div className="featured-record-copy">
              <span>{featuredProduct.artist}</span>
              <strong>{featuredProduct.title}</strong>
              <span>{formatCurrency(featuredProduct.price, featuredProduct.currency)}</span>
            </div>
          </Link>
          {featuredProducts.length > 1 && <div className="featured-carousel-controls">
            <button type="button" onClick={() => setFeaturedIndex(current => (current - 1 + featuredProducts.length) % featuredProducts.length)} aria-label="Disco destacado anterior"><ChevronLeft size={20} /></button>
            <button type="button" onClick={() => setCarouselPaused(current => !current)} aria-label={carouselPaused ? "Reanudar carrusel" : "Pausar carrusel"}>{carouselPaused ? <Play size={18} /> : <Pause size={18} />}</button>
            <span aria-live="off">{featuredIndex + 1} / {featuredProducts.length}</span>
            <button type="button" onClick={() => setFeaturedIndex(current => (current + 1) % featuredProducts.length)} aria-label="Siguiente disco destacado"><ChevronRight size={20} /></button>
          </div>}
        </div>}
      </section>

      {homepageContent.trustStripVisible && homepageContent.trustItems.length > 0 && <section className="trust-strip" aria-label="Informacion de compra">
        {homepageContent.trustItems.map((item, index) => <span key={`${index}-${item}`}>{item}</span>)}
      </section>}

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
            <span>{catalogSource}</span>
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
                    <Link className="product-image-link" href={getProductDetailHref(product)} aria-label={`Ver ${product.title}`}>
                      {imageContent}
                    </Link>
                  )}
                  <div className="product-card-body">
                    <div>
                      <p>{product.artist}</p>
                      <h3>{product.title}</h3>
                    </div>
                    <div className="product-meta">
                      {product.format && <span>{product.format}</span>}
                      {product.genre && <span>{product.genre}</span>}
                      {product.year && <span>{product.year}</span>}
                      {product.country && <span>{product.country}</span>}
                      {product.label && <span>{product.label}</span>}
                    </div>
                    <div className="condition-row">
                      {product.mediaCondition && <span>Disco {product.mediaCondition}</span>}
                      {product.sleeveCondition && <span>Tapa {product.sleeveCondition}</span>}
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

      {homepageContent.infoSectionVisible && <section className="info-section" id="clasificacion">
        <div>
          <p className="eyebrow">{homepageContent.infoEyebrow}</p>
          <h2>{homepageContent.infoHeading}</h2>
        </div>
        <SimpleRichText value={homepageContent.infoBody} />
      </section>}

      {homepageSections.length > 0 && <div className="homepage-sections">
        {homepageSections.map(section => <section className="homepage-content-section" key={section.id} id={`seccion-${section.id}`}>
          <div>
            <h2>{section.title}</h2>
            <SimpleRichText value={section.body} />
          </div>
        </section>)}
      </div>}

      <CartDrawer
        open={cartOpen}
        products={cartProducts}
        total={cartTotalLabel}
        onClose={() => setCartOpen(false)}
        onRemove={removeFromCart}
        orderUrl={buildWhatsAppUrl(buildOrderMessage())}
      />
      <button
        className={`back-to-top${showBackToTop ? " visible" : ""}`}
        type="button"
        aria-label="Ir arriba"
        title="Ir arriba"
        onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      >
        <ArrowUp size={20} />
      </button>
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

function getProductDetailHref(product: Product) {
  if (staticProductSlugs.has(product.slug)) {
    return `/producto/${product.slug}`;
  }

  return `/producto?slug=${encodeURIComponent(product.slug)}`;
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
