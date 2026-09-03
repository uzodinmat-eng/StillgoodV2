import Link from "next/link";
import { ArrowLeft, PackageX } from "lucide-react";

export default function ProductNotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
          <PackageX className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-black text-slate-900">That rescue deal is gone</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          No Stillgood listing matches this link. It may have sold out or the URL is mistyped.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to marketplace
        </Link>
      </div>
    </div>
  );
}
