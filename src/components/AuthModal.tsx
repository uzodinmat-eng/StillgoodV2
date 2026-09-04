"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, User, X } from "lucide-react";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Customer, Order } from "@/lib/types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoggedIn?: (account: {
    customer: Customer;
    orders: Order[];
    savingsTotal: number;
  }) => void | Promise<void>;
}

export function AuthModal({ isOpen, onClose, onLoggedIn }: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const finishLogin = async (account: {
    customer: Customer;
    orders: Order[];
    savingsTotal: number;
  }) => {
    await onLoggedIn?.(account);
    onClose();
    if (window.location.pathname !== "/account") {
      router.push("/account");
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    startTransition(async () => {
      if (mode === "signup") {
        const result = await signUpWithEmail({ email, password, name });
        if (!result.success) {
          setErrorMsg(result.error || "Could not create account.");
          return;
        }
        if (result.needsConfirmation) {
          setInfoMsg("Check your email to confirm your account, then log in.");
          setMode("signin");
          return;
        }
        if (result.customer) {
          await finishLogin({
            customer: result.customer,
            orders: result.orders ?? [],
            savingsTotal: result.savingsTotal ?? 0,
          });
        }
        return;
      }

      const result = await signInWithEmail({ email, password });
      if (!result.success || !result.customer) {
        setErrorMsg(result.error || "Could not log in.");
        return;
      }
      await finishLogin({
        customer: result.customer,
        orders: result.orders ?? [],
        savingsTotal: result.savingsTotal ?? 0,
      });
    });
  };

  const handleGoogle = () => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const supabase = createBrowserSupabase();
        const redirectTo = `${window.location.origin}/auth/callback?next=/account`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
        if (error) setErrorMsg(error.message);
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : "Google sign-in failed.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 border border-slate-200 z-10 space-y-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
          <Mail className="w-7 h-7" />
        </div>

        <div className="text-center">
          <h3 className="text-base font-black text-slate-900">
            {mode === "signin" ? "Log in to Stillgood" : "Create your Stillgood account"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Email is the main login. Google is optional. Guest checkout still works if you skip this.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            {infoMsg}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={isPending}
          className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.46c-.28 1.5-1.12 2.77-2.39 3.63v3.02h3.87c2.26-2.08 3.55-5.14 3.55-8.68z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.96-1.08 7.95-2.92l-3.87-3.02c-1.08.72-2.47 1.15-4.08 1.15-3.14 0-5.8-2.12-6.75-4.96H1.26v3.11C3.24 21.3 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.25 14.25c-.24-.72-.38-1.49-.38-2.25s.14-1.53.38-2.25V6.64H1.26C.46 8.24 0 10.06 0 12s.46 3.76 1.26 5.36l3.99-3.11z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0 7.31 0 3.24 2.7 1.26 6.64l3.99 3.11C6.2 6.87 8.86 4.75 12 4.75z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span className="flex-1 h-px bg-slate-200" />
          or email
          <span className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Amina Bello"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="amina@email.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span>
              {isPending
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : "Log in"}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setErrorMsg(null);
            setInfoMsg(null);
          }}
          className="w-full text-[11px] font-bold text-slate-500 hover:text-slate-800"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Log in"}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5"
        >
          <User className="w-3.5 h-3.5" />
          Continue as guest
        </button>
      </div>
    </div>
  );
}
