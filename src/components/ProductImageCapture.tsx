"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Upload, X, AlertCircle } from "lucide-react";

interface ProductImageCaptureProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export function ProductImageCapture({ images, onChange }: ProductImageCaptureProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handler (reads file as base64 data URL)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Please choose an image under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange([...images, reader.result]);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
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
        Product Photos & Packaging Inspection
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
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Upload from Device</span>
          </button>

          {/* Hidden File Input (supports direct phone camera capture too) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <span className="text-[10px] text-slate-400 font-medium">
            (JPG, PNG, WebP up to 5MB)
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
