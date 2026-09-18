"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Upload, X, AlertCircle } from "lucide-react";

interface ProductImageCaptureProps {
  images: string[];
  onChange: (images: string[]) => void;
}

// Server Actions reject request bodies over 1MB by default, so uploaded
// laptop photos are downscaled + re-encoded in the browser before they
// ever reach the server. Camera captures are already ~800px JPEGs.
const MAX_EDGE = 1000;
const JPEG_QUALITY = 0.82;

/**
 * Downscales any image File to a compact JPEG data URL.
 * Throws with a friendly message when the file is not a usable image.
 */
async function compressImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file is not an image. Use JPG, PNG, or WebP.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read that file. Try again."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That image could not be processed. Try a different photo."));
    image.src = dataUrl;
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing is not supported in this browser.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export function ProductImageCapture({ images, onChange }: ProductImageCaptureProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => () => { streamRef.current?.getTracks().forEach((track) => track.stop()); }, []);

  // File Upload Handler (compresses laptop photos before they are stored)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (images.length >= 6) {
      setCameraError("A listing can hold at most 6 photos.");
      e.target.value = "";
      return;
    }

    setCameraError(null);
    setUploading(true);
    try {
      const dataUrl = await compressImageFile(files[0]);
      onChange([...images, dataUrl]);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "Image upload failed. Try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Start in-browser Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 800 }, height: { ideal: 800 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(async () => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      });
    } catch {
      setCameraError("Camera access was denied or not available. Use file upload instead.");
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Capture Photo Frame from Video
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    canvas.width = video.videoWidth || 600;
    canvas.height = video.videoHeight || 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onChange([...images, dataUrl]);
    stopCamera();
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <label className="text-[11px] font-bold text-slate-600 block">
        Product Photos & Packaging Inspection *
      </label>

      {/* Image Thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2.5 pb-1">
          {images.map((img, idx) => (
            <div
              key={idx}
              className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs group"
            >
              <Image src={img} alt={`Product ${idx + 1}`} fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white transition-colors"
                title="Remove photo"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Live Camera View */}
      {cameraActive ? (
        <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 p-3 space-y-3">
          <div className="relative aspect-square max-w-xs mx-auto rounded-xl overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-2 border-dashed border-emerald-400/60 rounded-xl pointer-events-none" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={capturePhoto}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md cursor-pointer"
            >
              Take Photo
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Take Photo Button */}
          <button
            type="button"
            onClick={startCamera}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Use Camera</span>
          </button>

          {/* Upload File Button */}
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>{uploading ? "Processing…" : "Upload from Device"}</span>
          </button>

          {/* Hidden File Input — no capture attribute: on laptops this must
              open the file picker, not a camera view */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <span className="text-[10px] text-slate-400 font-medium">
            (JPG, PNG, WebP — resized automatically)
          </span>
        </div>
      )}

      {cameraError && (
        <p className="text-[11px] text-amber-700 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {cameraError}
        </p>
      )}
    </div>
  );
}
