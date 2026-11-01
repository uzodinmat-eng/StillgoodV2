"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, ImagePlus, X } from "lucide-react";
import { compressImageFile } from "@/components/ProductImageCapture";

interface StorePhotoUploadProps {
  /** Current photo as a data URL, or null when none has been chosen yet. */
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  /** Hide the Remove button when clearing the photo is not allowed. */
  allowRemove?: boolean;
}

/**
 * One photo of the store front. Shown on the marketplace and on the store page
 * in place of the default picture.
 */
export function StorePhotoUpload({ value, onChange, disabled = false, allowRemove = true }: StorePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      const dataUrl = await compressImageFile(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use that photo. Try another.");
    } finally {
      setProcessing(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <span className="text-[11px] font-bold text-slate-600 block">Store photo (optional)</span>
      <div className="flex items-center gap-3">
        <div className="relative w-28 h-20 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
          {value ? (
            <Image src={value} alt="Store photo preview" fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400 text-center px-2">
              No photo yet
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={disabled || processing}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors disabled:opacity-60"
            >
              <ImagePlus className="w-4 h-4 text-emerald-600" />
              <span>{processing ? "Processing…" : value ? "Replace photo" : "Upload store photo"}</span>
            </button>
            {value && allowRemove && (
              <button
                type="button"
                disabled={disabled || processing}
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold disabled:opacity-60"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            JPG, PNG, or WebP. Resized automatically. Use a clear photo of your entrance or shopfront.
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>
      {error && (
        <p className="text-[11px] text-amber-700 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
