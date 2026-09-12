import { createSupabaseBrowserClient } from "./client";
import { maxProductImages, type ImageDraft } from "@/types/product-image";
import { mapProductImageRecord, productImageBucket, type ProductImageRecord } from "./products";

export function imageDrafts(images: ProductImageRecord[]): ImageDraft[] {
  return images.map(image => ({ id: image.id, url: image.publicUrl, storagePath: image.storagePath, name: image.altText }));
}

export async function saveProductGallery(productId: string, images: ImageDraft[], expectedPaths: string[]) {
  if (images.length > maxProductImages) throw new Error("Cada disco admite hasta 5 imágenes.");
  const supabase = createSupabaseBrowserClient();
  const gallery: { storage_path: string; alt_text: string }[] = [];
  // Deterministic paths keep upload retries from creating duplicate files.
  for (const image of images) {
    let storagePath = image.storagePath;
    if (image.file) {
      const extension = image.file.name.split(".").pop()?.toLowerCase() || "jpg";
      storagePath = `${productId}/${image.id}.${extension}`;
      const { error } = await supabase.storage.from(productImageBucket).upload(storagePath, image.file, {
        contentType: image.file.type, upsert: true
      });
      if (error) throw error;
    }
    if (!storagePath) throw new Error("No se pudo identificar una imagen del disco.");
    gallery.push({ storage_path: storagePath, alt_text: image.name });
  }
  const { data, error } = await supabase.rpc("save_product_gallery", {
    target_product: productId, expected_paths: expectedPaths, gallery
  });
  if (error) throw error;
  const removedPaths = expectedPaths.filter(path => !gallery.some(image => image.storage_path === path));
  let cleanupWarning = "";
  if (removedPaths.length) {
    try {
      const { error: cleanupError } = await supabase.storage.from(productImageBucket).remove(removedPaths);
      if (cleanupError) throw cleanupError;
    } catch {
      cleanupWarning = "Las imágenes quedaron guardadas, pero no se pudieron limpiar algunos archivos anteriores.";
    }
  }
  return { images: data.map(mapProductImageRecord), cleanupWarning };
}
