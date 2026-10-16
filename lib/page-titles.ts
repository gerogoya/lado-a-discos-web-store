import type { Product } from "@/types/product";

export const storeTitle = "LADO A DISCOS | Vinilos usados y nuevos";
export const privacyTitle = "Privacidad | LADO A DISCOS";
export const loadingProductTitle = "Cargando disco | LADO A DISCOS";

// Keep analytics consistent with the visible detail heading.
export function productDisplayName(product: Pick<Product, "title" | "album">) {
  return product.title.trim() || product.album.trim() || "Disco sin título";
}

export function productPageTitle(product: Pick<Product, "artist" | "title" | "album">) {
  return `${product.artist.trim() || "Artista sin especificar"} - ${productDisplayName(product)} | LADO A DISCOS`;
}
