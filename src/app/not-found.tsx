import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-3">
        <h1 className="text-xl font-black">Page not found</h1>
        <p className="text-sm text-slate-600">That page is not in the Stillgood market.</p>
        <Link
          className="inline-block rounded-xl bg-emerald-600 px-4 py-2 text-white font-bold"
          href="/"
        >
          Back to marketplace
        </Link>
      </div>
    </main>
  );
}
