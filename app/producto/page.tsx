import { Suspense } from "react";
import { ProductQueryPage } from "@/components/ProductQueryPage";
import { loadingProductTitle } from "@/lib/page-titles";

export const metadata = { title: loadingProductTitle };

export default function ProductPage() {
  return (
    <Suspense fallback={<p>Cargando disco…</p>}>
      <ProductQueryPage />
    </Suspense>
  );
}
