export const catalogKinds = ["genre", "format", "country", "label", "artist", "sleeve_condition", "media_condition"] as const;
export type CatalogKind = (typeof catalogKinds)[number];
export type CatalogOption = {
  id: string;
  kind: CatalogKind;
  name: string;
  active: boolean;
  sort_order: number;
};
export const catalogLabels: Record<CatalogKind, string> = {
  genre: "Géneros", format: "Formatos", country: "Países", label: "Sellos",
  artist: "Artistas", sleeve_condition: "Estados de tapa", media_condition: "Estados de medio"
};
export const fieldLabels: Record<CatalogKind, string> = {
  genre: "Género", format: "Formato", country: "País", label: "Label/Sello",
  artist: "Nombre del artista", sleeve_condition: "Estado de tapa", media_condition: "Estado de medio"
};
export function normalizeOptionName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}
export function searchOptionName(value: string) {
  return normalizeOptionName(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
