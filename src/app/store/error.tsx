"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function StoreError({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  retry?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const recover = retry ?? reset;

  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 p-6">
      <div className="text-center space-y-3 max-w-md">
        <h1 className="text-xl font-black text-slate-900">Store portal hit a snag</h1>
        <p className="text-sm text-slate-600">
          We could not load this supermarket view. Check your store access and try again.
        </p>
        <div className="flex items-center justify-center gap-2">
          {recover && (
            <button
              type="button"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-white font-bold"
              onClick={() => recover()}
            >
              Try again
            </button>
          )}
          <Link
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700"
            href="/"
          >
            Marketplace
          </Link>
        </div>
      </div>
    </main>
  );
}
