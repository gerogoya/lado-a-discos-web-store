import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  ProductImageRow,
  ProductIdentifierInsert,
  ProductIdentifierRow,
  ProductInsert,
  ProductRow,
  ProductUpdate
} from "@/lib/supabase/database.types";
import type { Product, ProductCondition, ProductCurrency, ProductStatus } from "@/types/product";
import type { CatalogKind } from "@/types/catalog";
import type { ProductImageRecord } from "@/types/product-image";
export type { ProductImageRecord } from "@/types/product-image";

export const productImageBucket = "product-images";
export const productDescriptionMaxLength = 600;

export type ProductIdentifierRecord = {
  id: string;
  productId: string;
  type: ProductIdentifierRow["type"];
  value: string;
  description: string;
  sortOrder: number;
  createdAt: string;
};

export type ProductRecord = Product & {
  description: string;
  images: ProductImageRecord[];
  identifiers: ProductIdentifierRecord[];
  createdAt: string;
  updatedAt: string;
};

export type ProductEditorInput = {
  slug: string;
  artist: string;
  title: string;
  album: string;
  description: string;
  year: number | null;
  genre: string;
  price: number;
  currency: ProductCurrency;
  status: ProductStatus;
  mediaCondition: ProductCondition;
  sleeveCondition: ProductCondition;
  stock: number;
  isNew: boolean;
  featured: boolean;
  country: string;
  format: string;
  label: string;
  optionIds: Partial<Record<CatalogKind, string | null>>;
  needsReview: boolean;
};

type ProductQueryRow = ProductRow & {
  product_images: ProductImageRow[] | null;
  product_identifiers: ProductIdentifierRow[] | null;
};

const productSelect = `
  *,
  product_images(*),
  product_identifiers(*)
`;

export async function listProductsFromSupabase({ includeDrafts = false } = {}) {
  const supabase = createSupabaseBrowserClient();
  let query = supabase.from("products").select(productSelect).order("created_at", { ascending: false });

  if (!includeDrafts) {
    query = query.eq("status", "published");
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProductQueryRow[]).map((product) => mapProductRecord(product));
}

export async function getProductBySlugFromSupabase(slug: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.from("products").select(productSelect).eq("slug", slug).maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapProductRecord(data as ProductQueryRow) : null;
}

export async function createProductInSupabase(product: ProductEditorInput) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.from("products").insert(toProductInsert(product)).select(productSelect).single();

  if (error) {
    throw error;
  }

  return mapProductRecord(data as ProductQueryRow);
}

export async function updateProductInSupabase(productId: string, product: Partial<ProductEditorInput>) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.from("products").update(toProductUpdate(product)).eq("id", productId).select(productSelect).single();

  if (error) {
    throw error;
  }

  return mapProductRecord(data as ProductQueryRow);
}

export async function deleteProductFromSupabase(productId: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("products").delete().eq("id", productId);

  if (error) {
    throw error;
  }
}


export async function replaceProductIdentifiersInSupabase(productId: string, identifiers: ProductIdentifierInsert[]) {
  const supabase = createSupabaseBrowserClient();
  const { error: deleteError } = await supabase.from("product_identifiers").delete().eq("product_id", productId);

  if (deleteError) {
    throw deleteError;
  }

  if (!identifiers.length) {
    return [];
  }

  const payload = identifiers.map((identifier, index) => ({
    ...identifier,
    product_id: productId,
    sort_order: identifier.sort_order ?? index
  }));

  const { data, error } = await supabase.from("product_identifiers").insert(payload).select("*").order("sort_order");

  if (error) {
    throw error;
  }

  return (data ?? []).map((identifier) => mapProductIdentifierRecord(identifier));
}

export function mapProductRecord(product: ProductQueryRow): ProductRecord {
  const images = (product.product_images ?? [])
    .map((image) => mapProductImageRecord(image))
    .sort((firstImage, secondImage) => firstImage.sortOrder - secondImage.sortOrder || firstImage.id.localeCompare(secondImage.id));
  const identifiers = (product.product_identifiers ?? [])
    .map((identifier) => mapProductIdentifierRecord(identifier))
    .sort((firstIdentifier, secondIdentifier) => firstIdentifier.sortOrder - secondIdentifier.sortOrder);

  return {
    id: product.id,
    slug: product.slug,
    artist: product.artist,
    title: product.title,
    album: product.album,
    description: product.description,
    price: Number(product.price),
    currency: product.currency,
    mediaCondition: product.media_condition,
    sleeveCondition: product.sleeve_condition,
    genre: product.genre,
    year: product.year,
    country: product.country ?? "",
    format: product.format ?? "",
    label: product.label ?? "",
    optionIds: {
      artist: product.artist_id, genre: product.genre_id, country: product.country_id,
      format: product.format_id, label: product.label_id,
      media_condition: product.media_condition_id, sleeve_condition: product.sleeve_condition_id
    },
    needsReview: product.needs_review ?? true,
    photos: images.map((image) => image.publicUrl),
    stock: product.stock,
    status: product.status,
    isNew: product.is_new,
    featured: product.featured,
    featuredOrder: product.featured_order,
    images,
    identifiers,
    createdAt: product.created_at,
    updatedAt: product.updated_at
  };
}

export function mapProductImageRecord(image: ProductImageRow): ProductImageRecord {
  return {
    id: image.id,
    productId: image.product_id,
    storagePath: image.storage_path,
    publicUrl: getProductImagePublicUrl(image.storage_path),
    altText: image.alt_text,
    sortOrder: image.sort_order,
    createdAt: image.created_at
  };
}

function mapProductIdentifierRecord(identifier: ProductIdentifierRow): ProductIdentifierRecord {
  return {
    id: identifier.id,
    productId: identifier.product_id,
    type: identifier.type,
    value: identifier.value,
    description: identifier.description,
    sortOrder: identifier.sort_order,
    createdAt: identifier.created_at
  };
}

function toProductInsert(product: ProductEditorInput): ProductInsert {
  return {
    ...catalogPayload(product),
    slug: product.slug,
    artist: product.artist,
    title: product.title,
    album: product.album,
    description: product.description.slice(0, productDescriptionMaxLength),
    year: product.year,
    genre: product.genre,
    price: product.price,
    currency: product.currency,
    status: product.status,
    media_condition: product.mediaCondition,
    sleeve_condition: product.sleeveCondition,
    stock: product.stock,
    is_new: product.isNew,
    featured: product.featured
  };
}

function toProductUpdate(product: Partial<ProductEditorInput>): ProductUpdate {
  return {
    ...catalogPayload(product),
    slug: product.slug,
    artist: product.artist,
    title: product.title,
    album: product.album,
    description: product.description?.slice(0, productDescriptionMaxLength),
    year: product.year,
    genre: product.genre,
    price: product.price,
    currency: product.currency,
    status: product.status,
    media_condition: product.mediaCondition,
    sleeve_condition: product.sleeveCondition,
    stock: product.stock,
    is_new: product.isNew,
    featured: product.featured
  };
}

function catalogPayload(product: Partial<ProductEditorInput>): ProductUpdate {
  return {
    country: product.country, format: product.format, label: product.label, needs_review: product.needsReview,
    artist_id: product.optionIds?.artist, genre_id: product.optionIds?.genre,
    country_id: product.optionIds?.country, format_id: product.optionIds?.format,
    label_id: product.optionIds?.label, media_condition_id: product.optionIds?.media_condition,
    sleeve_condition_id: product.optionIds?.sleeve_condition
  };
}

function getProductImagePublicUrl(storagePath: string) {
  const supabase = createSupabaseBrowserClient();

  return supabase.storage.from(productImageBucket).getPublicUrl(storagePath).data.publicUrl;
}
