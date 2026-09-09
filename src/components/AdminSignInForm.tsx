"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { signInAdminWithUsername } from "@/lib/admin-auth";

export function AdminSignInForm({ signedInEmail }: { signedInEmail?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signInAdminWithUsername({ username, password });
      if (!result.success) {
        setError(result.error || "Invalid username or password.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 max-w-md mx-auto">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <h2 className="text-sm font-black uppercase tracking-wider">Admin sign in</h2>
      </div>
      <p className="text-xs text-slate-500">
        Username + password. This is not guest checkout — only the admin account can
        open this desk.
      </p>
      {signedInEmail && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Signed in as {signedInEmail}, which is not on the admin allow-list. Sign in
          with the admin username below.
        </p>
      )}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-[11px] font-bold text-slate-500 space-y-1">
          <span>Username</span>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="Admin username"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <label className="block text-[11px] font-bold text-slate-500 space-y-1">
          <span>Password</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-60"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </section>
  );
}
