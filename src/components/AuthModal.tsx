"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Smartphone, ShieldCheck, ArrowRight, User } from "lucide-react";
import { requestOtp, verifyOtp } from "@/lib/auth";
import { DEV_OTP_CODE } from "@/lib/auth-utils";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoggedIn?: () => void;
}

export function AuthModal({ isOpen, onClose, onLoggedIn }: AuthModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      const result = await requestOtp(phone);
      if (!result.success) {
        setErrorMsg(result.error || "Could not send code.");
        return;
      }
      if (result.phone) setPhone(result.phone);
      setStep("otp");
    });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      const result = await verifyOtp({ phone, code, name });
      if (!result.success) {
        setErrorMsg(result.error || "Could not verify code.");
        return;
      }
      onLoggedIn?.();
      onClose();
      if (window.location.pathname !== "/account") {
        router.push("/account");
      }
      router.refresh();
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
          {step === "phone" ? <Smartphone className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
        </div>

        <div className="text-center">
          <h3 className="text-base font-black text-slate-900">
            {step === "phone" ? "Log in to Stillgood" : "Enter your code"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {step === "phone"
              ? "Buyers sign in with WhatsApp. Guest checkout still works if you skip this."
              : `We sent a code to ${phone}. This development build always accepts ${DEV_OTP_CODE}.`}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={handleRequest} className="space-y-3">
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
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">
                WhatsApp number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0803 456 7890"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span>{isPending ? "Sending code…" : "Send login code"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">
                6-digit code
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={DEV_OTP_CODE}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black tracking-[0.3em] text-center text-slate-800 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              Development OTP: <span className="font-black">{DEV_OTP_CODE}</span>
            </p>
            <button
              type="submit"
              disabled={isPending || code.length < 6}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-60"
            >
              {isPending ? "Verifying…" : "Log in"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setErrorMsg(null);
              }}
              className="w-full text-[11px] font-bold text-slate-500 hover:text-slate-800"
            >
              Use a different number
            </button>
          </form>
        )}

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
