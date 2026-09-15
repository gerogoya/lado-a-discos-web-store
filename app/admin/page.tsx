"use client";

import "./catalog.css";

import Link from "next/link";
import { AlertCircle, CheckCircle2, ImagePlus, Lock, PackageCheck, Plus, Save, Search, Star, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { publicAsset } from "@/lib/assets";
import { createSlug } from "@/lib/product-storage";
import { formatCurrency } from "@/lib/format";
import { storeConfig } from "@/lib/store-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CatalogManager, CatalogProvider, CatalogReady } from "@/components/admin/CatalogOptions";
import { ProductImageEditor } from "@/components/admin/ProductImageEditor";
import { HomepageEditor } from "@/components/admin/HomepageEditor";
import { imageDrafts, saveProductGallery } from "@/lib/supabase/product-gallery";
import type { ImageDraft } from "@/types/product-image";
import { ProductFields, validateProduct } from "@/components/admin/ProductFields";
import { errorMessage } from "@/lib/supabase/catalog";
import {
  createProductInSupabase,
  deleteProductFromSupabase,
  listProductsFromSupabase,
  updateProductInSupabase,
  type ProductEditorInput
} from "@/lib/supabase/products";
import type { Product } from "@/types/product";

type ProductFormState = Omit<Product, "id" | "slug">;
type AdminToast = {
  id: number;
  type: "success" | "error";
  title: string;
  message: string;
};

const emptyProductForm: ProductFormState = {
  artist: "",
  title: "",
  album: "",
  description: "",
  price: 0,
  currency: "ARS",
  mediaCondition: "",
  sleeveCondition: "",
  genre: "",
  year: null,
  country: "",
  format: "",
  label: "",
  optionIds: {},
  needsReview: false,
  photos: [],
  stock: 1,
  status: "published",
  isNew: false,
  featured: false
};

export default function AdminPage() {
  const [section, setSection] = useState<"products" | "options" | "homepage">("products");
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [adminSource, setAdminSource] = useState("Cargando catálogo");
  const [loginError, setLoginError] = useState("");
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [toast, setToast] = useState<AdminToast | null>(null);
  const [editableProducts, setEditableProducts] = useState<Product[]>([]);
  const [pendingGalleries, setPendingGalleries] = useState<Record<string, ImageDraft[]>>({});
  const [newProduct, setNewProduct] = useState<ProductFormState>(emptyProductForm);
  const [newImages, setNewImages] = useState<ImageDraft[]>([]);
  const [readingNewImages, setReadingNewImages] = useState(false);
  const newSavedProductRef = useRef<Product | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const client = createSupabaseBrowserClient();
      void client.auth.getSession().then(({ data, error }) => {
        if (error) throw error;
        if (!cancelled) setLoggedIn(Boolean(data.session));
      }).catch(error => { if (!cancelled) setLoginError(errorMessage(error)); });
      const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
        if (!cancelled) setLoggedIn(Boolean(session));
      });
      return () => { cancelled = true; listener.subscription.unsubscribe(); };
    } catch (error) { setLoginError(errorMessage(error)); }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, toast.type === "error" ? 8000 : 4200);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!loggedIn) {
      return;
    }

    let cancelled = false;

    async function loadAuthenticatedProducts() {
      setProductsError("");
      try {
        const supabaseProducts = await listProductsFromSupabase({ includeDrafts: true });

        if (!cancelled) {
          setEditableProducts(supabaseProducts);
          setProductsLoaded(true);
          setAdminSource("Supabase");
        }
      } catch (error) {
        if (!cancelled) {
          setProductsError(errorMessage(error));
          showToast("error", "No se pudo cargar el catálogo", errorMessage(error));
        }
      }
    }

    loadAuthenticatedProducts();

    return () => {
      cancelled = true;
    };
  }, [loggedIn, loadAttempt]);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return editableProducts.filter((product) =>
      [product.artist, product.title, product.genre, product.country, product.year?.toString(), product.label, product.format]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    ).sort((first, second) => {
      const firstIsPersistedFeatured = first.featuredOrder !== null && first.featuredOrder !== undefined;
      const secondIsPersistedFeatured = second.featuredOrder !== null && second.featuredOrder !== undefined;
      if (firstIsPersistedFeatured !== secondIsPersistedFeatured) return firstIsPersistedFeatured ? -1 : 1;
      if (firstIsPersistedFeatured && secondIsPersistedFeatured) return (first.featuredOrder ?? 99) - (second.featuredOrder ?? 99);
      return 0;
    });
  }, [editableProducts, query]);
  const featuredCount = editableProducts.filter(product => product.featured).length + (newProduct.featured ? 1 : 0);

  function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");

    try {
      createSupabaseBrowserClient()
        .auth.signInWithPassword({
          email,
          password
        })
        .then(({ error }) => {
          if (error) {
            setLoginError(error.message);
            return;
          }

          window.localStorage.setItem(storeConfig.adminStorageKey, "true");
          setLoggedIn(true);
          setPassword("");
        })
        .catch((error: Error) => {
          setLoginError(error.message);
        });
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "No se pudo iniciar sesion.");
    }
  }

  function showToast(type: AdminToast["type"], title: string, message: string) {
    setToast({
      id: Date.now(),
      type,
      title,
      message
    });
  }

  function showFeaturedLimit() {
    showToast("error", "Límite de destacados", "Ya hay 5 discos destacados. Quitá uno, guardá el cambio y luego seleccioná otro.");
  }

  function updateProduct(product: Product, patch: Partial<Product>) {
    setEditableProducts((currentProducts) =>
      currentProducts.map((currentProduct) => (currentProduct.id === product.id ? { ...currentProduct, ...patch } : currentProduct))
    );
  }

  async function saveExistingProduct(product: Product) {
    setSavingProductId(product.id);
    let metadataSaved = false;
    try {
      validateProduct(product, Boolean(product.needsReview));
      if (product.featured && (product.featuredOrder === null || product.featuredOrder === undefined)) {
        const pendingRemovals = editableProducts.filter(item =>
          item.id !== product.id && !item.featured && item.featuredOrder !== null && item.featuredOrder !== undefined
        );
        for (const pendingRemoval of pendingRemovals) {
          const savedRemoval = await updateProductInSupabase(pendingRemoval.id, { featured: false });
          setEditableProducts(current => current.map(item => item.id === savedRemoval.id ? savedRemoval : item));
        }
      }
      const savedProduct = await updateProductInSupabase(product.id, toProductEditorInput(product));
      metadataSaved = true;
      const pending = pendingGalleries[product.id];
      let productWithImages = savedProduct;
      let warning = "";
      if (pending !== undefined) {
        const result = await saveProductGallery(product.id, pending, (product.images ?? []).map(image => image.storagePath));
        productWithImages = { ...savedProduct, images: result.images, photos: result.images.map(image => image.publicUrl) };
        warning = result.cleanupWarning;
      }
      setEditableProducts(current => current.map(item => item.id === product.id ? productWithImages : item));
      setPendingGalleries(current => { const next = { ...current }; delete next[product.id]; return next; });
      showToast(warning ? "error" : "success", "Cambios guardados", warning || `${productWithImages.artist} - ${productWithImages.title}`);
    } catch (error) {
      showToast("error", metadataSaved ? "Datos guardados; faltan las imágenes" : "No se pudo guardar",
        getErrorMessage(error, "No se pudo guardar el disco."));
    } finally { setSavingProductId(null); }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Eliminar "${product.artist} - ${product.title}" del catalogo?`)) {
      return;
    }

    setDeletingProductId(product.id);

    try {
      await deleteProductFromSupabase(product.id);
      setEditableProducts((currentProducts) => currentProducts.filter((currentProduct) => currentProduct.id !== product.id));
      setAdminSource("Supabase");
      showToast("success", "Disco eliminado", `${product.artist} - ${product.title}`);
    } catch (error) {
      showToast("error", "No se pudo eliminar", getErrorMessage(error, "No se pudo eliminar el producto."));
    } finally {
      setDeletingProductId(null);
    }
  }

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingProduct || readingNewImages) return;
    try { validateProduct(newProduct); }
    catch (error) { showToast("error", "Revisá los datos", errorMessage(error)); return; }
    setCreatingProduct(true);
    try {
      const title = newProduct.title.trim();
      const artist = newProduct.artist.trim();
      const input = toProductEditorInput({
        ...newProduct, id: "pending", title, artist, album: title,
        slug: newSavedProductRef.current?.slug ?? createSlug(`${artist}-${title}-${Date.now()}`)
      });
      // Keep an incomplete new disk in draft, and reuse it if an image upload needs a retry.
      const saved = newSavedProductRef.current
        ? await updateProductInSupabase(newSavedProductRef.current.id, { ...input, status: "draft" })
        : await createProductInSupabase({ ...input, status: "draft" });
      newSavedProductRef.current = saved;
      const result = await saveProductGallery(saved.id, newImages, (saved.images ?? []).map(image => image.storagePath));
      newSavedProductRef.current = { ...saved, images: result.images, photos: result.images.map(image => image.publicUrl) };
      const completed = await updateProductInSupabase(saved.id, { status: input.status });
      setEditableProducts(current => [completed, ...current.filter(item => item.id !== completed.id)]);
      newSavedProductRef.current = null;
      setNewProduct(emptyProductForm);
      setNewImages([]);
      showToast("success", "Disco agregado", `${completed.artist} - ${completed.title}`);
    } catch (error) {
      showToast("error", newSavedProductRef.current ? "Disco en borrador; guardado incompleto" : "No se pudo agregar",
        getErrorMessage(error, "No se pudo guardar el disco.") + (newSavedProductRef.current ? " Podés reintentar sin crear otro disco." : ""));
    } finally { setCreatingProduct(false); }
  }

  if (!loggedIn) {
    return (
      <main className="admin-login">
        <form className="login-card" onSubmit={submitLogin}>
          <ProductImage src={publicAsset("/brand/lado-a-discos-logo.jpg")} alt="LADO A DISCOS" width={88} height={88} priority />
          <div>
            <p className="eyebrow">Admin Supabase</p>
            <h1>Ingresar a LADO A DISCOS</h1>
            <p>Usa un usuario local de Supabase para guardar cambios en la base.</p>
          </div>
          <label>
            <Lock size={18} />
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email admin" />
          </label>
          <label>
            <Lock size={18} />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />
          </label>
          {loginError ? <p className="admin-message error">{loginError}</p> : null}
          <button className="primary-action" type="submit">
            Entrar
          </button>
          <Link href="/">Volver al sitio</Link>
        </form>
      </main>
    );
  }

  return (
    <CatalogProvider notify={showToast}>
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Panel admin</p>
          <h1>Inventario editable</h1>
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
              try {
                createSupabaseBrowserClient().auth.signOut();
              } catch (error) {
                console.warn("Could not sign out from Supabase.", error);
              }
              setLoggedIn(false);
              setProductsLoaded(false);
            }}
          >
            Salir
          </button>
        </div>
      </header>

      <section className="admin-summary">
        <div>
          <PackageCheck size={22} />
          <span>{editableProducts.length} discos en catalogo</span>
        </div>
        <div>
          <Save size={22} />
          <span>{adminSource}</span>
        </div>
        <div>
          <Star size={22} />
          <span>{featuredCount} de 5 destacados</span>
        </div>
      </section>
      <ToastMessage toast={toast} onClose={() => setToast(null)} />
      {productsError && <div className="admin-message error" role="alert">
        {productsError}
        <button type="button" className="secondary-action" onClick={() => setLoadAttempt(current => current + 1)}>Reintentar carga</button>
      </div>}
      <nav className="admin-sections" aria-label="Secciones del admin">
        <button type="button" aria-pressed={section === "products"} onClick={() => setSection("products")}>Discos</button>
        <button type="button" aria-pressed={section === "options"} onClick={() => setSection("options")}>Opciones del catálogo</button>
        <button type="button" aria-pressed={section === "homepage"} onClick={() => setSection("homepage")}>Página principal</button>
      </nav>
      <div hidden={section !== "options"}><CatalogManager /></div>
      <div hidden={section !== "homepage"}><HomepageEditor showToast={showToast} /></div>
      <div hidden={section !== "products"}>

      <section className="admin-create-panel" aria-label="Nuevo disco">
        <div className="admin-panel-heading">
          <div>
            <p className="eyebrow">Nuevo disco</p>
            <h2>Agregar producto</h2>
          </div>
          <ImagePlus size={24} />
        </div>
        <form onSubmit={addProduct}>
        <CatalogReady busy={creatingProduct || readingNewImages || !productsLoaded}>
        <ProductFields product={newProduct} featuredDisabled={!newProduct.featured && featuredCount >= 5} onFeaturedLimit={showFeaturedLimit} onChange={patch => setNewProduct(current => ({ ...current, ...patch }))} />
        <ProductImageEditor images={newImages} onChange={setNewImages} onBusy={setReadingNewImages}
          onError={message => showToast("error", "No se pudieron agregar las imágenes", message)}
          onPrepared={() => showToast("success", "Imagen preparada", "Las imágenes se guardarán al agregar el disco.")} />
        <div className="admin-create-actions">
          <button className="primary-action" type="submit" disabled={creatingProduct}>
            <Plus size={18} />
            {creatingProduct ? "Agregando..." : "Agregar disco"}
          </button>
        </div>
        </CatalogReady>
        </form>
      </section>

      <label className="admin-search">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto..." />
      </label>

      <section className="admin-table" aria-label="Productos">
        {visibleProducts.map((product) => (
          <article className="admin-row" key={product.id}>
            <div className="admin-cover">
              <ProductImage src={pendingGalleries[product.id]?.[0]?.url ?? (pendingGalleries[product.id] ? undefined : product.photos[0])} alt={product.title} width={112} height={112} />
              <span>{formatCurrency(product.price, product.currency)}</span>
              {product.needsReview && <small className="catalog-review-badge">Datos por revisar</small>}
            </div>

            <ProductEditor
              product={product}
              featuredDisabled={!product.featured && featuredCount >= 5}
              onFeaturedLimit={showFeaturedLimit}
              saving={savingProductId === product.id}
              deleting={deletingProductId === product.id}
              onChange={(patch) => updateProduct(product, patch)}
              images={pendingGalleries[product.id] ?? imageDrafts(product.images ?? [])}
              onImagesChange={images => setPendingGalleries(current => ({ ...current, [product.id]: images }))}
              onImageError={message => showToast("error", "No se pudieron agregar las imágenes", message)}
              onPrepared={() => showToast("success", "Imagen preparada", "Las imágenes y su orden se guardarán al presionar Guardar.")}
              onSave={() => saveExistingProduct(product)}
              onDelete={() => deleteProduct(product)}
            />
          </article>
        ))}
      </section>
      </div>
    </main>
    </CatalogProvider>
  );
}

function ProductEditor({
  product, featuredDisabled, saving, deleting, onChange, onFeaturedLimit, images, onImagesChange, onImageError, onPrepared, onSave, onDelete
}: {
  product: Product; featuredDisabled: boolean; saving: boolean; deleting: boolean;
  onChange: (patch: Partial<Product>) => void;
  onFeaturedLimit: () => void;
  images: ImageDraft[]; onImagesChange: (images: ImageDraft[]) => void;
  onImageError: (message: string) => void; onPrepared: () => void;
  onSave: () => void; onDelete: () => void;
}) {
  const [reading, setReading] = useState(false);
  return <form onSubmit={event => { event.preventDefault(); if (!reading) onSave(); }}>
    <CatalogReady busy={saving || deleting || reading}>
      <ProductFields product={product} featuredDisabled={featuredDisabled} onFeaturedLimit={onFeaturedLimit} onChange={onChange} />
      <ProductImageEditor images={images} onChange={onImagesChange} onError={onImageError} onPrepared={onPrepared} onBusy={setReading} />
      <div className="admin-row-actions">
        <button className="admin-save-button" type="submit" disabled={saving || deleting || reading}><Save size={16} />{saving ? "Guardando..." : "Guardar"}</button>
        <button className="admin-delete-button" type="button" disabled={saving || deleting || reading} onClick={onDelete}><Trash2 size={16} />{deleting ? "Eliminando..." : "Eliminar"}</button>
      </div>
    </CatalogReady>
  </form>;
}

function ToastMessage({ toast, onClose }: { toast: AdminToast | null; onClose: () => void }) {
  if (!toast) {
    return null;
  }

  const Icon = toast.type === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={`admin-toast ${toast.type}`} aria-label="Notificación" role={toast.type === "error" ? "alert" : "status"} aria-live={toast.type === "error" ? "assertive" : "polite"}>
      <Icon size={20} />
      <div>
        <strong>{toast.title}</strong>
        <span>{toast.message}</span>
      </div>
      <button type="button" onClick={onClose} aria-label="Cerrar mensaje">
        <X size={16} />
      </button>
    </div>
  );
}

function toProductEditorInput(product: Product): ProductEditorInput {
  return {
    slug: product.slug,
    artist: product.artist.trim() || "Artista por completar",
    title: product.title.trim() || "Disco sin titulo",
    album: product.album.trim() || product.title.trim() || "Album por completar",
    description: product.description || "",
    year: product.year,
    genre: product.genre.trim(),
    country: product.country,
    format: product.format ?? "",
    label: product.label ?? "",
    optionIds: product.optionIds ?? {},
    needsReview: product.needsReview ?? false,
    price: Number(product.price) || 0,
    currency: product.currency,
    status: product.status,
    mediaCondition: product.mediaCondition,
    sleeveCondition: product.sleeveCondition,
    stock: Number(product.stock) || 0,
    isNew: product.isNew,
    featured: Boolean(product.featured)
  };
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return errorMessage(error, fallbackMessage);
}
