import { createSupabaseBrowserClient } from "./client";
import type { CatalogKind, CatalogOption } from "@/types/catalog";

export async function listCatalogOptions(): Promise<CatalogOption[]> {
  const all: CatalogOption[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await createSupabaseBrowserClient().from("catalog_options")
      .select("id,kind,name,active,sort_order").order("id").range(offset, offset + 499);
    if (error) throw error;
    all.push(...data);
    if (data.length < 500) return all;
  }
}

export async function createCatalogOption(kind: CatalogKind, name: string) {
  const { data, error } = await createSupabaseBrowserClient().from("catalog_options")
    .insert({ kind, name: name.trim().replace(/\s+/g, " ") }).select().single();
  if (error) throw error;
  return data;
}

export async function updateCatalogOption(id: string, patch: Partial<Pick<CatalogOption, "name" | "active">>) {
  const { data, error } = await createSupabaseBrowserClient().from("catalog_options")
    .update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCatalogOption(id: string) {
  const { error } = await createSupabaseBrowserClient().from("catalog_options").delete().eq("id", id);
  if (error) throw error;
}

export function errorMessage(error: unknown, fallback = "No se pudo completar la operación.") {
  if (error && typeof error === "object") {
    const value = error as { code?: string; message?: string; details?: string; hint?: string };
    if (value.code === "23505") return "Ya existe una opción con ese nombre. Revisá también las opciones desactivadas.";
    if (value.code === "23503") return "Esta opción está en uso. Podés desactivarla, pero no eliminarla.";
    return [value.message || fallback, value.details, value.hint, value.code && `Código: ${value.code}`].filter(Boolean).join(" · ");
  }
  return fallback;
}
