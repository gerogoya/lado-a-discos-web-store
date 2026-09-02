import type { ProductCurrency } from "@/types/product";

export function formatCurrency(value: number, currency: ProductCurrency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}
