"use client";

import Image from "next/image";
import Link from "next/link";
import { Lock, PackageCheck, Save, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { products } from "@/lib/products";
import { storeConfig } from "@/lib/store-config";
import type { ProductStatus } from "@/types/product";

const demoPassword = "ladoa-demo";

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [inventory, setInventory] = useState<Record<string, ProductStatus>>({});

  useEffect(() => {
    setLoggedIn(window.localStorage.getItem(storeConfig.adminStorageKey) === "true");

    const savedInventory = window.localStorage.getItem(storeConfig.inventoryStorageKey);
    if (savedInventory) {
      setInventory(JSON.parse(savedInventory) as Record<string, ProductStatus>);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storeConfig.inventoryStorageKey, JSON.stringify(inventory));
  }, [inventory]);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) =>
      [product.artist, product.title, product.genre, product.country, product.year.toString()]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query]);

  function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password === demoPassword) {
      window.localStorage.setItem(storeConfig.adminStorageKey, "true");
      setLoggedIn(true);
      setPassword("");
    }
  }

  function updateStatus(productId: string, status: ProductStatus) {
    setInventory((current) => ({
      ...current,
      [productId]: status
    }));
  }

  if (!loggedIn) {
    return (
      <main className="admin-login">
        <form className="login-card" onSubmit={submitLogin}>
          <Image src="/brand/lado-a-discos-logo.jpg" alt="LADO A DISCOS" width={88} height={88} priority />
          <div>
            <p className="eyebrow">Admin mock</p>
            <h1>Ingresar a LADO A DISCOS</h1>
            <p>Primer login local para validar el flujo. Backend real y seguridad vendran con Supabase.</p>
          </div>
          <label>
            <Lock size={18} />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password demo: ladoa-demo"
            />
          </label>
          <button className="primary-action" type="submit">
            Entrar
          </button>
          <Link href="/">Volver al sitio</Link>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Panel admin</p>
          <h1>Inventario mock</h1>
        </div>
        <div className="admin-actions">
          <Link className="secondary-action" href="/">
            Ver sitio
          </Link>
          <button
            className="secondary-action"
            type="button"
            onClick={() => {
              window.localStorage.removeItem(storeConfig.adminStorageKey);
              setLoggedIn(false);
            }}
          >
            Salir
          </button>
        </div>
      </header>

      <section className="admin-summary">
        <div>
          <PackageCheck size={22} />
          <span>{products.length} productos mock</span>
        </div>
        <div>
          <Save size={22} />
          <span>Cambios guardados localmente</span>
        </div>
      </section>

      <label className="admin-search">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto..." />
      </label>

      <section className="admin-table" aria-label="Productos">
        {visibleProducts.map((product) => {
          const status = inventory[product.id] ?? product.status;

          return (
            <article className="admin-row" key={product.id}>
              <Image src={product.photos[0]} alt={product.title} width={72} height={72} />
              <div className="admin-product-main">
                <strong>{product.title}</strong>
                <span>{product.artist}</span>
                <small>
                  {product.genre} · {product.year} · {product.country}
                </small>
              </div>
              <div className="admin-product-meta">
                <span>{formatCurrency(product.price)}</span>
                <span>
                  {product.mediaCondition}/{product.sleeveCondition}
                </span>
              </div>
              <select value={status} onChange={(event) => updateStatus(product.id, event.target.value as ProductStatus)}>
                <option value="published">Publicado</option>
                <option value="reserved">Reservado</option>
                <option value="sold">Vendido</option>
                <option value="draft">Borrador</option>
              </select>
            </article>
          );
        })}
      </section>
    </main>
  );
}
