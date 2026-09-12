"use client";

import { CatalogField } from "./CatalogOptions";
import { type CatalogKind, type CatalogOption } from "@/types/catalog";
import type { Product } from "@/types/product";

export const productOptionFields = {
  genre: "genre", format: "format", country: "country", artist: "artist", label: "label",
  sleeve_condition: "sleeveCondition", media_condition: "mediaCondition"
} as const;
const fieldOrder: CatalogKind[] = ["artist", "genre", "format", "country", "label", "media_condition", "sleeve_condition"];

export function validateProduct(product: Omit<Product, "id" | "slug">) {
  if (!product.title.trim()) throw new Error("Ingresá el título del disco.");
  if (!product.optionIds?.artist) throw new Error("Seleccioná un artista o agregá uno nuevo.");
  if (!product.optionIds?.genre) throw new Error("Seleccioná un género.");
  if (!product.optionIds?.format) throw new Error("Seleccioná un formato.");
  if (!product.optionIds?.media_condition || !product.optionIds?.sleeve_condition) throw new Error("Seleccioná el estado de medio y el estado de tapa.");
  if (product.year !== null && (!Number.isInteger(product.year) || product.year < 1900 || product.year > new Date().getFullYear() + 1)) throw new Error("Seleccioná un año válido.");
  if (!Number.isFinite(product.price) || product.price < 0) throw new Error("El precio no puede ser negativo.");
}

export function ProductFields({ product, onChange, featuredDisabled = false }: {
  product: Omit<Product, "id" | "slug">;
  onChange: (patch: Partial<Product>) => void;
  featuredDisabled?: boolean;
}) {
  const maxYear = new Date().getFullYear() + 1;
  const years = Array.from({ length: maxYear - 1899 }, (_, index) => maxYear - index);
  function select(kind: CatalogKind, option: CatalogOption | null) {
    onChange({ [productOptionFields[kind]]: option?.name ?? "", optionIds: { ...product.optionIds, [kind]: option?.id ?? null } });
  }
  return <div className="admin-fields-grid">
    <label className="admin-field"><span>Título del disco</span><input required value={product.title} onChange={event => onChange({ title: event.target.value })} /></label>
    {fieldOrder.map(kind => <CatalogField key={kind} kind={kind} value={product.optionIds?.[kind]}
      legacyName={product[productOptionFields[kind]]} onChange={option => select(kind, option)} />)}
    <label className="admin-field"><span>Año</span><select aria-label="Año" value={product.year ?? ""} onChange={event => onChange({ year: event.target.value ? Number(event.target.value) : null })}>
      <option value="">Sin especificar</option>{years.map(year => <option key={year} value={year}>{year}</option>)}
    </select></label>
    <label className="admin-field"><span>Precio</span><input type="number" min="0" step="0.01" required value={product.price} onChange={event => onChange({ price: Number(event.target.value) })} /></label>
    <label className="admin-field"><span>Moneda</span><select aria-label="Moneda" value={product.currency} onChange={event => onChange({ currency: event.target.value as Product["currency"] })}>
      <option value="ARS">Peso argentino</option><option value="USD">Dólar americano</option>
    </select></label>
    <label className="admin-field"><span>Estado de publicación</span><select aria-label="Estado de publicación" value={product.status} onChange={event => onChange({ status: event.target.value as Product["status"] })}>
      <option value="published">Publicado</option><option value="reserved">Reservado</option><option value="sold">Vendido</option><option value="draft">Borrador</option>
    </select></label>
    <label className="catalog-review" title={featuredDisabled ? "Ya hay 5 discos destacados. Quitá uno antes de seleccionar otro." : undefined}><input type="checkbox" checked={Boolean(product.featured)} disabled={featuredDisabled} onChange={event => onChange({ featured: event.target.checked })} />Destacado en el hero</label>
    <label className="admin-field admin-field-wide"><span>Descripción</span><textarea maxLength={600} value={product.description} onChange={event => onChange({ description: event.target.value })} /></label>
    {product.needsReview && <label className="catalog-review admin-field-wide"><input type="checkbox" onChange={event => { if (event.target.checked) onChange({ needsReview: false }); }} />Confirmar que revisé los datos heredados de este disco.</label>}
  </div>;
}
