export type ProductStatus = "published" | "reserved" | "sold" | "draft";

import type { CatalogKind } from "./catalog";
import type { ProductImageRecord } from "./product-image";

export type ProductCondition = string;

export type ProductCurrency = "ARS" | "USD";

export type Product = {
  id: string;
  slug: string;
  artist: string;
  title: string;
  album: string;
  description: string;
  price: number;
  currency: ProductCurrency;
  mediaCondition: ProductCondition;
  sleeveCondition: ProductCondition;
  genre: string;
  year: number | null;
  country: string;
  format?: string;
  label?: string;
  optionIds?: Partial<Record<CatalogKind, string | null>>;
  needsReview?: boolean;
  photos: string[];
  images?: ProductImageRecord[];
  stock: number;
  status: ProductStatus;
  isNew: boolean;
  featured?: boolean;
  featuredOrder?: number | null;
};
