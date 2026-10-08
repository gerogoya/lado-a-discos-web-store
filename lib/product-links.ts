import { products } from "@/lib/products";
import { publicAsset } from "@/lib/assets";

const staticSlugs = new Set(products.map(product => product.slug));
export const siteUrl = "https://www.ladoadiscos.com";

export function getProductDetailHref(product: { slug: string }) {
  return staticSlugs.has(product.slug)
    ? `/producto/${encodeURIComponent(product.slug)}/`
    : `/producto/?slug=${encodeURIComponent(product.slug)}`;
}

export function getProductShareUrl(product: { slug: string }, origin = siteUrl) {
  return new URL(publicAsset(getProductDetailHref(product)), origin).href;
}
