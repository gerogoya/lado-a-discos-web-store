"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, ImagePlus, Lock, PackageCheck, Plus, Save, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { publicAsset } from "@/lib/assets";
import {
  buildClientProducts,
  createSlug,
  readLegacyInventory,
  readProductOverrides,
  saveProductOverrides
} from "@/lib/product-storage";
import { formatCurrency } from "@/lib/format";
import { storeConfig } from "@/lib/store-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  createProductInSupabase,
  deleteProductFromSupabase,
  listProductsFromSupabase,
  replaceProductImagesInSupabase,
  updateProductInSupabase,
  uploadProductImageToSupabase,
  type ProductEditorInput
} from "@/lib/supabase/products";
import type { Product, ProductCurrency, ProductStatus } from "@/types/product";

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
  mediaCondition: "VG+",
  sleeveCondition: "VG+",
  genre: "",
  year: new Date().getFullYear(),
  country: "Argentina",
  photos: [],
  stock: 1,
  status: "published",
  isNew: false,
  featured: false
};

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [adminSource, setAdminSource] = useState("Catalogo local");
  const [loginError, setLoginError] = useState("");
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [toast, setToast] = useState<AdminToast | null>(null);
  const [editableProducts, setEditableProducts] = useState<Product[]>([]);
  const [productOverrides, setProductOverrides] = useState<Record<string, Product>>({});
  const [pendingProductImageFiles, setPendingProductImageFiles] = useState<Record<string, File[]>>({});
  const [newProduct, setNewProduct] = useState<ProductFormState>(emptyProductForm);
  const [newProductImageFiles, setNewProductImageFiles] = useState<File[]>([]);
  const pendingProductImageFilesRef = useRef<Record<string, File[]>>({});
  const newProductImageFilesRef = useRef<File[]>([]);

  useEffect(() => {
    let cancelled = false;
    const savedLegacyInventory = readLegacyInventory();
    const savedProductOverrides = readProductOverrides();
    const localProducts = buildClientProducts(savedProductOverrides, savedLegacyInventory);

    try {
      createSupabaseBrowserClient()
        .auth.getSession()
        .then(({ data }) => {
          if (!cancelled && data.session) {
            setLoggedIn(true);
          }
        })
        .catch((error) => {
          console.warn("Could not read Supabase session.", error);
        });
    } catch (error) {
      console.warn("Could not initialize Supabase auth.", error);
    }

    setProductOverrides(savedProductOverrides);
    setEditableProducts(localProducts);
    setHydrated(true);

    async function loadSupabaseProducts() {
      try {
        const supabaseProducts = await listProductsFromSupabase({ includeDrafts: true });

        if (!cancelled && supabaseProducts.length) {
          const supabaseProductIds = new Set(supabaseProducts.map((product) => product.id));
          const productsWithLocalOverrides = supabaseProducts.map((product) => savedProductOverrides[product.id] ?? product);
          const localOnlyProducts = Object.values(savedProductOverrides).filter((product) => !supabaseProductIds.has(product.id));

          setEditableProducts([...productsWithLocalOverrides, ...localOnlyProducts]);
          setAdminSource("Supabase local");
        }
      } catch (error) {
        console.warn("Using local admin catalog fallback.", error);
      }
    }

    loadSupabaseProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveProductOverrides(productOverrides);
    }
  }, [hydrated, productOverrides]);

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
      try {
        const supabaseProducts = await listProductsFromSupabase({ includeDrafts: true });

        if (!cancelled && supabaseProducts.length) {
          setEditableProducts(supabaseProducts);
          setAdminSource("Supabase local");
        }
      } catch (error) {
        console.warn("Could not load authenticated admin catalog.", error);
      }
    }

    loadAuthenticatedProducts();

    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return editableProducts.filter((product) =>
      [product.artist, product.title, product.album, product.genre, product.country, product.year.toString()]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [editableProducts, query]);

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

  function updateProduct(product: Product, patch: Partial<Product>) {
    const updatedProduct = {
      ...product,
      ...patch
    };

    setEditableProducts((currentProducts) =>
      currentProducts.map((currentProduct) => (currentProduct.id === product.id ? updatedProduct : currentProduct))
    );
  }

  async function saveExistingProduct(product: Product) {
    setSavingProductId(product.id);

    try {
      const savedProduct = await updateProductInSupabase(product.id, toProductEditorInput(product));
      const pendingImageFiles = pendingProductImageFilesRef.current[product.id] ?? pendingProductImageFiles[product.id] ?? [];
      const uploadedImages = await replaceProductImagesInSupabase({
        productId: savedProduct.id,
        files: pendingImageFiles
      });
      const productWithImages = uploadedImages.length
        ? {
            ...savedProduct,
            photos: uploadedImages.map((image) => image.publicUrl),
            images: uploadedImages
          }
        : savedProduct;

      setEditableProducts((currentProducts) =>
        currentProducts.map((currentProduct) => (currentProduct.id === product.id ? productWithImages : currentProduct))
      );
      setProductOverrides((currentProducts) => {
        const nextProducts = { ...currentProducts };
        delete nextProducts[product.id];
        return nextProducts;
      });
      setPendingProductImageFiles((currentFiles) => {
        const nextFiles = { ...currentFiles };
        delete nextFiles[product.id];
        pendingProductImageFilesRef.current = nextFiles;
        return nextFiles;
      });
      setAdminSource("Supabase local");
      showToast(
        "success",
        "Cambios guardados",
        uploadedImages.length
          ? `${productWithImages.artist} - ${productWithImages.title} con imagen actualizada`
          : `${productWithImages.artist} - ${productWithImages.title}`
      );
    } catch (error) {
      showToast("error", "No se pudo guardar", getErrorMessage(error, "No se pudo guardar el producto."));
    } finally {
      setSavingProductId(null);
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Eliminar "${product.artist} - ${product.title}" del catalogo?`)) {
      return;
    }

    setDeletingProductId(product.id);

    try {
      await deleteProductFromSupabase(product.id);
      setEditableProducts((currentProducts) => currentProducts.filter((currentProduct) => currentProduct.id !== product.id));
      setProductOverrides((currentProducts) => {
        const nextProducts = { ...currentProducts };
        delete nextProducts[product.id];
        return nextProducts;
      });
      setAdminSource("Supabase local");
      showToast("success", "Disco eliminado", `${product.artist} - ${product.title}`);
    } catch (error) {
      showToast("error", "No se pudo eliminar", getErrorMessage(error, "No se pudo eliminar el producto."));
    } finally {
      setDeletingProductId(null);
    }
  }

  async function updateProductImages(product: Product, fileList: FileList | null) {
    const files = fileList ? Array.from(fileList) : [];
    const nextPendingImageFiles = {
      ...pendingProductImageFilesRef.current,
      [product.id]: files
    };

    pendingProductImageFilesRef.current = nextPendingImageFiles;
    setPendingProductImageFiles(nextPendingImageFiles);

    try {
      const photos = await readImageFiles(files);

      if (photos.length) {
        updateProduct(product, { photos });
        showToast("success", "Imagen preparada", "Presiona Guardar para subirla a Supabase.");
      }
    } catch (error) {
      setPendingProductImageFiles((currentFiles) => {
        const nextFiles = { ...currentFiles };
        delete nextFiles[product.id];
        pendingProductImageFilesRef.current = nextFiles;
        return nextFiles;
      });
      showToast("error", "No se pudo leer la imagen", getErrorMessage(error, "No se pudo leer la imagen seleccionada."));
    }
  }

  async function updateNewProductImages(fileList: FileList | null) {
    const files = fileList ? Array.from(fileList) : [];

    newProductImageFilesRef.current = files;
    setNewProductImageFiles(files);

    try {
      const photos = await readImageFiles(files);

      if (photos.length) {
        setNewProduct((currentProduct) => ({
          ...currentProduct,
          photos
        }));
        showToast("success", "Imagen preparada", "Presiona Agregar disco para subirla a Supabase.");
      }
    } catch (error) {
      newProductImageFilesRef.current = [];
      setNewProductImageFiles([]);
      showToast("error", "No se pudo leer la imagen", getErrorMessage(error, "No se pudo leer la imagen seleccionada."));
    }
  }

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingProduct(true);

    const title = newProduct.title.trim() || "Disco sin titulo";
    const artist = newProduct.artist.trim() || "Artista por completar";
    const album = newProduct.album.trim() || title;
    const slug = createSlug(`${artist}-${album}-${Date.now()}`);
    const createdProduct: Product = {
      ...newProduct,
      id: "pending",
      slug,
      title,
      artist,
      album,
      genre: newProduct.genre.trim() || "Genero por completar",
      country: newProduct.country.trim() || "Argentina",
      price: Number(newProduct.price) || 0,
      year: Number(newProduct.year) || new Date().getFullYear(),
      photos: newProduct.photos.length ? newProduct.photos : [publicAsset("/brand/lado-a-discos-logo.jpg")]
    };

    try {
      const savedProduct = await createProductInSupabase(toProductEditorInput(createdProduct));
      const pendingImageFiles = newProductImageFilesRef.current.length ? newProductImageFilesRef.current : newProductImageFiles;
      const uploadedImages = await Promise.all(
        pendingImageFiles.map((file, index) =>
          uploadProductImageToSupabase({
            productId: savedProduct.id,
            file,
            sortOrder: index
          })
        )
      );
      const productWithImages = uploadedImages.length
        ? {
            ...savedProduct,
            photos: uploadedImages.map((image) => image.publicUrl),
            images: uploadedImages
          }
        : savedProduct;

      setEditableProducts((currentProducts) => [productWithImages, ...currentProducts]);
      setAdminSource("Supabase local");
      showToast(
        "success",
        "Disco agregado",
        uploadedImages.length
          ? `${productWithImages.artist} - ${productWithImages.title} con imagen guardada`
          : `${productWithImages.artist} - ${productWithImages.title}`
      );
      setNewProduct(emptyProductForm);
      newProductImageFilesRef.current = [];
      setNewProductImageFiles([]);
    } catch (error) {
      showToast("error", "No se pudo agregar", getErrorMessage(error, "No se pudo agregar el producto en Supabase."));
    } finally {
      setCreatingProduct(false);
    }
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
          <span>{adminSource} · guardado en Supabase</span>
        </div>
      </section>
      <ToastMessage toast={toast} onClose={() => setToast(null)} />

      <section className="admin-create-panel" aria-label="Nuevo disco">
        <div className="admin-panel-heading">
          <div>
            <p className="eyebrow">Nuevo disco</p>
            <h2>Agregar producto</h2>
          </div>
          <ImagePlus size={24} />
        </div>
        <ProductForm product={newProduct} onChange={setNewProduct} onImageChange={updateNewProductImages} />
        {newProduct.photos[0] ? (
          <div className="admin-new-preview">
            <ProductImage src={newProduct.photos[0]} alt="Vista previa del disco nuevo" width={78} height={78} />
            <span>{newProductImageFiles.length ? `${newProductImageFiles.length} imagen preparada` : "Imagen preparada"}</span>
          </div>
        ) : null}
        <form className="admin-create-actions" onSubmit={addProduct}>
          <button className="primary-action" type="submit" disabled={creatingProduct}>
            <Plus size={18} />
            {creatingProduct ? "Agregando..." : "Agregar disco"}
          </button>
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
              <ProductImage src={product.photos[0]} alt={product.title} width={112} height={112} />
              <span>{formatCurrency(product.price, product.currency)}</span>
            </div>

            <ProductEditor
              product={product}
              saving={savingProductId === product.id}
              deleting={deletingProductId === product.id}
              onChange={(patch) => updateProduct(product, patch)}
              onImageChange={(files) => updateProductImages(product, files)}
              onSave={() => saveExistingProduct(product)}
              onDelete={() => deleteProduct(product)}
            />
          </article>
        ))}
      </section>
    </main>
  );
}

function ProductEditor({
  product,
  saving,
  deleting,
  onChange,
  onImageChange,
  onSave,
  onDelete
}: {
  product: Product;
  saving: boolean;
  deleting: boolean;
  onChange: (patch: Partial<Product>) => void;
  onImageChange: (files: FileList | null) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="admin-fields-grid">
      <TextField label="Titulo del disco" value={product.title} onChange={(value) => onChange({ title: value })} />
      <TextField label="Nombre del artista" value={product.artist} onChange={(value) => onChange({ artist: value })} />
      <TextField label="Album" value={product.album} onChange={(value) => onChange({ album: value })} />
      <TextAreaField label="Descripcion" value={product.description} onChange={(value) => onChange({ description: value })} />
      <NumberField label="Precio" value={product.price} onChange={(value) => onChange({ price: value })} />
      <NumberField label="Anio del disco" value={product.year} onChange={(value) => onChange({ year: value })} />
      <TextField label="Genero" value={product.genre} onChange={(value) => onChange({ genre: value })} />
      <CurrencyField value={product.currency} onChange={(value) => onChange({ currency: value })} />
      <StatusField value={product.status} onChange={(value) => onChange({ status: value })} />
      <ImageField onChange={onImageChange} />
      <div className="admin-row-actions">
        <button className="admin-save-button" type="button" disabled={saving || deleting} onClick={onSave}>
          <Save size={16} />
          {saving ? "Guardando..." : "Guardar"}
        </button>
        <button className="admin-delete-button" type="button" disabled={saving || deleting} onClick={onDelete}>
          <Trash2 size={16} />
          {deleting ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </div>
  );
}

function ToastMessage({ toast, onClose }: { toast: AdminToast | null; onClose: () => void }) {
  if (!toast) {
    return null;
  }

  const Icon = toast.type === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={`admin-toast ${toast.type}`} role="status" aria-live="polite">
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

function ProductForm({
  product,
  onChange,
  onImageChange
}: {
  product: ProductFormState;
  onChange: (product: ProductFormState) => void;
  onImageChange: (files: FileList | null) => void;
}) {
  return (
    <div className="admin-fields-grid">
      <TextField label="Titulo del disco" value={product.title} onChange={(value) => onChange({ ...product, title: value })} />
      <TextField label="Nombre del artista" value={product.artist} onChange={(value) => onChange({ ...product, artist: value })} />
      <TextField label="Album" value={product.album} onChange={(value) => onChange({ ...product, album: value })} />
      <TextAreaField label="Descripcion" value={product.description} onChange={(value) => onChange({ ...product, description: value })} />
      <NumberField label="Precio" value={product.price} onChange={(value) => onChange({ ...product, price: value })} />
      <NumberField label="Anio del disco" value={product.year} onChange={(value) => onChange({ ...product, year: value })} />
      <TextField label="Genero" value={product.genre} onChange={(value) => onChange({ ...product, genre: value })} />
      <CurrencyField value={product.currency} onChange={(value) => onChange({ ...product, currency: value })} />
      <StatusField value={product.status} onChange={(value) => onChange({ ...product, status: value })} />
      <ImageField onChange={onImageChange} />
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="admin-field admin-field-wide">
      <span>{label}</span>
      <textarea value={value} maxLength={600} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function CurrencyField({ value, onChange }: { value: ProductCurrency; onChange: (value: ProductCurrency) => void }) {
  return (
    <label className="admin-field">
      <span>Moneda</span>
      <select value={value} onChange={(event) => onChange(event.target.value as ProductCurrency)}>
        <option value="ARS">Peso argentino</option>
        <option value="USD">Dolar americano</option>
      </select>
    </label>
  );
}

function StatusField({ value, onChange }: { value: ProductStatus; onChange: (value: ProductStatus) => void }) {
  return (
    <label className="admin-field">
      <span>Estado</span>
      <select value={value} onChange={(event) => onChange(event.target.value as ProductStatus)}>
        <option value="published">Publicado</option>
        <option value="reserved">Reservado</option>
        <option value="sold">Vendido</option>
        <option value="draft">Borrador</option>
      </select>
    </label>
  );
}

function ImageField({ onChange }: { onChange: (files: FileList | null) => void }) {
  return (
    <label className="admin-field image-upload-field">
      <span>Imagenes</span>
      <input type="file" accept="image/*" multiple onChange={(event) => onChange(event.target.files)} />
    </label>
  );
}

async function readImageFiles(fileList: FileList | File[] | null) {
  if (!fileList) {
    return [];
  }

  return Promise.all(Array.from(fileList).map((file) => resizeImageFile(file)));
}

function resizeImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const image = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const maxSide = 1400;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");

      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.84));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo leer la imagen."));
    };

    image.src = objectUrl;
  });
}

function toProductEditorInput(product: Product): ProductEditorInput {
  return {
    slug: product.slug,
    artist: product.artist.trim() || "Artista por completar",
    title: product.title.trim() || "Disco sin titulo",
    album: product.album.trim() || product.title.trim() || "Album por completar",
    description: product.description || "",
    year: Number(product.year) || null,
    genre: product.genre.trim() || "Genero por completar",
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
  return error instanceof Error && error.message ? error.message : fallbackMessage;
}
