"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html>
      <body>
        <main className="min-h-screen grid place-items-center p-6">
          <div className="text-center space-y-3">
            <h1 className="text-xl font-black">Stillgood is temporarily unavailable</h1>
            {recover && (
              <button
                type="button"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-white font-bold"
                onClick={() => recover()}
              >
                Reload
              </button>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
