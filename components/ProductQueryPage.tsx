"use client";

import { useSearchParams } from "next/navigation";
import { ProductLookup } from "@/components/ProductLookup";

export function ProductQueryPage() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug")?.trim() || undefined;

  return <ProductLookup slug={slug} />;
}
