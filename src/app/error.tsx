"use client";

import { useEffect } from "react";

export default function Error({
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
    <main className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-3">
        <h1 className="text-xl font-black">Something went wrong</h1>
        <p className="text-sm text-slate-600">We could not complete that request.</p>
        {recover && (
          <button
            type="button"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-white font-bold"
            onClick={() => recover()}
          >
            Try again
          </button>
        )}
      </div>
    </main>
  );
}
