import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductById, getProducts, getRelatedProducts } from "@/lib/data";
import { ProductDetailView } from "@/components/ProductDetailView";

export async function generateStaticParams() {
  return getProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductById(slug);
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
  const product = getProductById(slug);
  if (!product) {
    notFound();
  }

  const related = getRelatedProducts(product);

  return <ProductDetailView product={product} relatedProducts={related} />;
}
