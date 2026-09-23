import { Suspense } from "react";
import { ShopView } from "@/components/ShopView";

export const dynamic = "force-dynamic";

export default function ShopPage() {
  return (
    <Suspense fallback={null}>
      <ShopView />
    </Suspense>
  );
}
