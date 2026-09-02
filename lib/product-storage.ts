import { products } from "@/lib/products";
import { storeConfig } from "@/lib/store-config";
import type { Product, ProductStatus } from "@/types/product";

export type ProductOverrides = Record<string, Product>;

const staticProductIds = new Set(products.map((product) => product.id));

export function readProductOverrides(): ProductOverrides {
  const savedProducts = window.localStorage.getItem(storeConfig.productOverridesStorageKey);

  if (!savedProducts) {
    return {};
  }

  try {
    return JSON.parse(savedProducts) as ProductOverrides;
  } catch {
    return {};
  }
}

export function readLegacyInventory(): Record<string, ProductStatus> {
  const savedInventory = window.localStorage.getItem(storeConfig.inventoryStorageKey);

  if (!savedInventory) {
    return {};
  }

  try {
    return JSON.parse(savedInventory) as Record<string, ProductStatus>;
  } catch {
    return {};
  }
}

export function saveProductOverrides(overrides: ProductOverrides) {
  window.localStorage.setItem(storeConfig.productOverridesStorageKey, JSON.stringify(overrides));
}

export function buildClientProducts(overrides: ProductOverrides, legacyInventory: Record<string, ProductStatus> = {}) {
  const mergedStaticProducts = products.map((product) => {
    const productWithLegacyStatus = {
      ...product,
      status: legacyInventory[product.id] ?? product.status
    };

    return overrides[product.id] ? { ...productWithLegacyStatus, ...overrides[product.id] } : productWithLegacyStatus;
  });

  const customProducts = Object.values(overrides).filter((product) => !staticProductIds.has(product.id));

  return [...mergedStaticProducts, ...customProducts];
}

export function createProductId() {
  return `custom-${Date.now()}`;
}

export function createSlug(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `disco-${Date.now()}`;
}

export function isCustomProduct(productId: string) {
  return !staticProductIds.has(productId);
}
