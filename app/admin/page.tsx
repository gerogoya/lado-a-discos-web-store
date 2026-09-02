"use client";

import Link from "next/link";
import { ImagePlus, Lock, PackageCheck, Plus, Save, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { publicAsset } from "@/lib/assets";
import {
  buildClientProducts,
  createProductId,
  createSlug,
  readLegacyInventory,
  readProductOverrides,
  saveProductOverrides
} from "@/lib/product-storage";
import { formatCurrency } from "@/lib/format";
import { storeConfig } from "@/lib/store-config";
import type { Product, ProductCurrency, ProductStatus } from "@/types/product";

type ProductFormState = Omit<Product, "id" | "slug">;

const demoPassword = "ladoa-demo";

const emptyProductForm: ProductFormState = {
  artist: "",
  title: "",
  album: "",
  price: 0,
  currency: "ARS",
  mediaCondition: "VG+",
  sleeveCondition: "VG+",
  genre: "",
  year: new Date().getFullYear(),
  country: "Argentina",
  photos: [],
  stock: 1,
  status: "draft",
  isNew: false,
  featured: false
};

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [legacyInventory, setLegacyInventory] = useState<Record<string, ProductStatus>>({});
  const [productOverrides, setProductOverrides] = useState<Record<string, Product>>({});
  const [newProduct, setNewProduct] = useState<ProductFormState>(emptyProductForm);

  useEffect(() => {
    setLoggedIn(window.localStorage.getItem(storeConfig.adminStorageKey) === "true");
    setLegacyInventory(readLegacyInventory());
    setProductOverrides(readProductOverrides());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveProductOverrides(productOverrides);
    }
  }, [hydrated, productOverrides]);

  const editableProducts = useMemo(() => {
    return buildClientProducts(productOverrides, legacyInventory);
  }, [legacyInventory, productOverrides]);

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

    if (password === demoPassword) {
      window.localStorage.setItem(storeConfig.adminStorageKey, "true");
      setLoggedIn(true);
      setPassword("");
    }
  }

  function saveProduct(product: Product) {
    setProductOverrides((currentProducts) => ({
      ...currentProducts,
      [product.id]: product
    }));
  }

  function updateProduct(product: Product, patch: Partial<Product>) {
    saveProduct({
      ...product,
      ...patch
    });
  }

  async function updateProductImages(product: Product, fileList: FileList | null) {
    const photos = await readImageFiles(fileList);

    if (photos.length) {
      updateProduct(product, { photos });
    }
  }

  async function updateNewProductImages(fileList: FileList | null) {
    const photos = await readImageFiles(fileList);

    if (photos.length) {
      setNewProduct((currentProduct) => ({
        ...currentProduct,
        photos
      }));
    }
  }

  function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const id = createProductId();
    const title = newProduct.title.trim() || "Disco sin titulo";
    const artist = newProduct.artist.trim() || "Artista por completar";
    const album = newProduct.album.trim() || title;
    const createdProduct: Product = {
      ...newProduct,
      id,
      slug: createSlug(`${artist}-${album}-${id}`),
      title,
      artist,
      album,
      genre: newProduct.genre.trim() || "Genero por completar",
      country: newProduct.country.trim() || "Argentina",
      price: Number(newProduct.price) || 0,
      year: Number(newProduct.year) || new Date().getFullYear(),
      photos: newProduct.photos.length ? newProduct.photos : [publicAsset("/brand/lado-a-discos-logo.jpg")]
    };

    saveProduct(createdProduct);
    setNewProduct(emptyProductForm);
  }

  if (!loggedIn) {
    return (
      <main className="admin-login">
        <form className="login-card" onSubmit={submitLogin}>
          <ProductImage src={publicAsset("/brand/lado-a-discos-logo.jpg")} alt="LADO A DISCOS" width={88} height={88} priority />
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
          <span>Cambios guardados localmente</span>
        </div>
      </section>

      <section className="admin-create-panel" aria-label="Nuevo disco">
        <div className="admin-panel-heading">
          <div>
            <p className="eyebrow">Nuevo disco</p>
            <h2>Agregar producto</h2>
          </div>
          <ImagePlus size={24} />
        </div>
        <ProductForm product={newProduct} onChange={setNewProduct} onImageChange={updateNewProductImages} />
        <form className="admin-create-actions" onSubmit={addProduct}>
          <button className="primary-action" type="submit">
            <Plus size={18} />
            Agregar disco
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

            <ProductEditor product={product} onChange={(patch) => updateProduct(product, patch)} onImageChange={(files) => updateProductImages(product, files)} />
          </article>
        ))}
      </section>
    </main>
  );
}

function ProductEditor({
  product,
  onChange,
  onImageChange
}: {
  product: Product;
  onChange: (patch: Partial<Product>) => void;
  onImageChange: (files: FileList | null) => void;
}) {
  return (
    <div className="admin-fields-grid">
      <TextField label="Titulo del disco" value={product.title} onChange={(value) => onChange({ title: value })} />
      <TextField label="Nombre del artista" value={product.artist} onChange={(value) => onChange({ artist: value })} />
      <TextField label="Album" value={product.album} onChange={(value) => onChange({ album: value })} />
      <NumberField label="Precio" value={product.price} onChange={(value) => onChange({ price: value })} />
      <NumberField label="Anio del disco" value={product.year} onChange={(value) => onChange({ year: value })} />
      <TextField label="Genero" value={product.genre} onChange={(value) => onChange({ genre: value })} />
      <CurrencyField value={product.currency} onChange={(value) => onChange({ currency: value })} />
      <StatusField value={product.status} onChange={(value) => onChange({ status: value })} />
      <ImageField onChange={onImageChange} />
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

async function readImageFiles(fileList: FileList | null) {
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
