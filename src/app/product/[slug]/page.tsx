import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/components/ProductDetailView";
import {
  findProductInCatalog,
  relatedProductsInCatalog,
} from "@/lib/catalog";
import { loadCatalog } from "@/lib/db/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await loadCatalog();
  const product = findProductInCatalog(catalog, slug);
  if (!product) {
    return { title: "Deal not found | Stillgood" };
  }
  return {
    title: `${product.name} | Stillgood`,
    description: `${product.discountPercent}% off ${product.brand} at a verified Abuja supermarket. ${product.description}`,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalog = await loadCatalog();
  const product = findProductInCatalog(catalog, slug);
  if (!product) {
    notFound();
  }

  const related = relatedProductsInCatalog(catalog, product);

  return <ProductDetailView product={product} relatedProducts={related} />;
}
