import { Suspense } from "react";
import { ProductLookup } from "@/components/ProductLookup";
import { ProductQueryPage } from "@/components/ProductQueryPage";

export default function ProductPage() {
  return (
    <Suspense fallback={<ProductLookup />}>
      <ProductQueryPage />
    </Suspense>
  );
}
