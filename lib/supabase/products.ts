import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  ProductImageInsert,
  ProductImageRow,
  ProductIdentifierInsert,
  ProductIdentifierRow,
  ProductInsert,
  ProductRow,
  ProductUpdate
} from "@/lib/supabase/database.types";
import type { Product, ProductCondition, ProductCurrency, ProductStatus } from "@/types/product";

export const productImageBucket = "product-images";
export const productDescriptionMaxLength = 600;

export type ProductImageRecord = {
  id: string;
  productId: string;
  storagePath: string;
  publicUrl: string;
  altText: string;
  sortOrder: number;
  createdAt: string;
};

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

export async function uploadProductImageToSupabase({
  productId,
  file,
  sortOrder
}: {
  productId: string;
  file: File;
  sortOrder: number;
}) {
  const supabase = createSupabaseBrowserClient();
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const storagePath = `${productId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(productImageBucket).upload(storagePath, file, {
    contentType: file.type,
    upsert: false
  });

  if (uploadError) {
    throw uploadError;
  }

  const imagePayload: ProductImageInsert = {
    product_id: productId,
    storage_path: storagePath,
    alt_text: file.name,
    sort_order: sortOrder
  };

  const { data, error } = await supabase.from("product_images").insert(imagePayload).select("*").single();

  if (error) {
    throw error;
  }

  return mapProductImageRecord(data);
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
    .sort((firstImage, secondImage) => firstImage.sortOrder - secondImage.sortOrder);
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
    year: product.year ?? new Date().getFullYear(),
    country: "Argentina",
    photos: images.map((image) => image.publicUrl),
    stock: product.stock,
    status: product.status,
    isNew: product.is_new,
    featured: product.featured,
    images,
    identifiers,
    createdAt: product.created_at,
    updatedAt: product.updated_at
  };
}

function mapProductImageRecord(image: ProductImageRow): ProductImageRecord {
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

function getProductImagePublicUrl(storagePath: string) {
  const supabase = createSupabaseBrowserClient();

  return supabase.storage.from(productImageBucket).getPublicUrl(storagePath).data.publicUrl;
}
