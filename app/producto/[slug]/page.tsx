import { ProductLookup } from "@/components/ProductLookup";
import { getProductBySlug, products } from "@/lib/products";
import { getProductBySlugFromSupabase } from "@/lib/supabase/products";
import { loadingProductTitle, productPageTitle } from "@/lib/page-titles";

export function generateStaticParams() {
  return products.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug) ?? (await getProductBySlugFromSupabase(slug));
  if (!product) return { title: loadingProductTitle };
  return {
    title: productPageTitle(product),
    description: `${product.genre}, ${product.country}, ${product.year}. Estado disco ${product.mediaCondition}, tapa ${product.sleeveCondition}.`
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductLookup key={slug} slug={slug} />;
}
