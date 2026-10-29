"use client";

import React from "react";
import Image from "next/image";
import { Camera, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
import { CameraStatus } from "@/hooks/useCamera";
import { useI18n } from "@/lib/i18n";

interface CameraPermissionScreenProps {
  cameraStatus: CameraStatus;
  onEnableCamera: () => void;
}

export default function CameraPermissionScreen({
  cameraStatus,
  onEnableCamera,
}: CameraPermissionScreenProps) {
  const isDenied = cameraStatus === "denied";
  const { t } = useI18n();

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/90 backdrop-blur-2xl text-white select-none animate-in fade-in duration-300">
      {/* Background radial glow */}
      <div className="absolute w-96 h-96 rounded-full bg-orange-600/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full flex flex-col items-center text-center space-y-6">
        {/* Logo preview */}
        <div className="relative w-56 sm:w-64 h-28 sm:h-32 flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="Aura Farmers 67"
            fill
            priority
            className="object-contain drop-shadow-[0_0_25px_rgba(251,146,60,0.7)]"
          />
        </div>

        {/* Camera icon badge */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-b from-purple-900/60 to-black/80 border-2 border-orange-500/50 flex items-center justify-center shadow-[0_0_25px_rgba(249,115,22,0.4)]">
          {isDenied ? (
            <ShieldAlert className="w-10 h-10 text-rose-400 animate-pulse" />
          ) : (
            <Camera className="w-10 h-10 text-amber-400 animate-bounce" />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400">
            {isDenied ? t("cameraDeniedTitle") : t("cameraRequiredTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-sm mx-auto">
            {isDenied ? t("cameraDeniedDesc") : t("cameraRequiredDesc")}
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onEnableCamera}
          className="cursor-pointer group relative flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-b from-amber-500 via-orange-600 to-rose-700 border-2 border-yellow-300 shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:scale-105 active:scale-95 transition-all duration-200"
        >
          {isDenied ? (
            <RefreshCw className="w-5 h-5 text-white" />
          ) : (
            <Sparkles className="w-5 h-5 text-yellow-200 animate-spin" />
          )}
          <span className="text-sm font-black uppercase tracking-widest text-white [text-shadow:_0_2px_0_#450a0a]">
            {isDenied ? t("retryCamera") : t("allowCamera")}
          </span>
        </button>
      </div>
    </div>
  );
}
