"use client";

import React from "react";
import Image from "next/image";
import {
  Flame,
  Trophy,
  Settings,
  Volume2,
  VolumeX,
  Zap,
  ShoppingBag,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { startMainMenuTour } from "@/lib/tour";
import LegalModal from "@/components/layout/LegalModal";

interface MainMenuProps {
  onPlayClick: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  musicMuted: boolean;
  musicPlaying: boolean;
  onToggleMusic: () => void;
  auraPoints: number;
  coins: number;
}

export default function MainMenu({
  onPlayClick,
  onOpenShop,
  onOpenLeaderboard,
  onOpenSettings,
  musicMuted,
  musicPlaying,
  onToggleMusic,
  auraPoints,
  coins,
}: MainMenuProps) {
  const { t, lang } = useI18n();
  const [showLegalModal, setShowLegalModal] = React.useState(false);

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 select-none animate-in fade-in duration-300">
      {/* Top floating bar: Guide Help (?), Coins, Aura balance & Sound */}
      <div className="w-full max-w-4xl flex items-center justify-between shrink-0">
        <div id="tour-balance" className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-mono font-bold text-amber-300 shadow-xl">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>{auraPoints.toLocaleString()} {t("accumulatedAura")}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black/60 backdrop-blur-md border border-yellow-400/50 text-xs font-mono font-bold text-yellow-300 shadow-xl">
            <span>🟡</span>
            <span>{coins.toLocaleString()}</span>
          </div>
        </div>

        {/* Top Right Actions: Interactive Tour Guide (?) & Audio toggle */}
        <div className="flex items-center gap-2">
          <button
            id="tour-help"
            onClick={() => startMainMenuTour(lang)}
            aria-label={t("tourGuide")}
            title={t("tourGuide")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-cyan-950/70 hover:bg-cyan-900/80 backdrop-blur-md border border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_20px_rgba(34,211,238,0.6)] transition cursor-pointer hover:scale-105 active:scale-95 text-xs font-bold font-mono"
          >
            <HelpCircle className="w-4 h-4 text-cyan-300 animate-pulse" />
            <span>?</span>
          </button>

          <button
            id="tour-audio"
            onClick={onToggleMusic}
            aria-label={musicMuted || !musicPlaying ? "Unmute" : "Mute"}
            title={musicMuted || !musicPlaying ? "Unmute" : "Mute"}
            className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white shadow-xl transition cursor-pointer hover:scale-105 active:scale-95"
          >
            {musicMuted || !musicPlaying ? (
              <VolumeX className="w-4 h-4 text-zinc-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            )}
          </button>
        </div>
      </div>

      {/* Main Center Stage */}
      <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-7 my-auto max-w-md w-full">
        {/* Prominent Logo */}
        <div className="relative w-80 sm:w-96 h-40 sm:h-48 flex items-center justify-center animate-pulse">
          <Image
            src="/logo.png"
            alt="Aura Farmers 67"
            fill
            priority
            className="object-contain drop-shadow-[0_0_35px_rgba(251,146,60,0.85)] filter"
          />
        </div>

        {/* Action Buttons Hub with High Contrast & Vibrancy */}
        <div className="flex flex-col items-center w-full space-y-3.5">
          {/* BIG ARCADE PLAY BUTTON */}
          <button
            id="tour-play"
            onClick={onPlayClick}
            className="group relative cursor-pointer w-full max-w-xs transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            {/* Outer flame glow */}
            <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-400 to-rose-600 rounded-3xl blur-xl opacity-85 group-hover:opacity-100 transition duration-300 animate-pulse" />

            {/* Fiery Container */}
            <div className="relative py-4 sm:py-4.5 px-8 rounded-2xl bg-gradient-to-b from-amber-500 via-orange-600 to-rose-700 border-3 border-yellow-300 shadow-[0_0_35px_rgba(245,158,11,0.7)] flex items-center justify-center gap-3">
              <Flame className="w-8 h-8 text-yellow-200 animate-bounce drop-shadow-[0_0_8px_rgba(251,146,60,1)]" />

              <span className="text-2xl sm:text-3xl font-black tracking-widest uppercase text-white [text-shadow:_0_2px_0_#450a0a,_0_4px_0_#450a0a]">
                {t("play")}
              </span>

              <Zap className="w-7 h-7 text-cyan-200 drop-shadow-[0_0_8px_rgba(34,211,238,1)]" />
            </div>
          </button>

          {/* SHOP BUTTON */}
          <button
            id="tour-shop"
            onClick={onOpenShop}
            className="group relative cursor-pointer w-full max-w-xs py-3 px-5 rounded-xl bg-gradient-to-b from-emerald-600 via-teal-700 to-emerald-900 border-2 border-emerald-300 shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_25px_rgba(16,185,129,0.8)] hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-200" />
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white [text-shadow:_0_1px_0_#064e3b]">
              {t("shop")}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
          </button>

          {/* Secondary Buttons Row: LEADERBOARD & SETTINGS */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            {/* LEADERBOARD BUTTON */}
            <button
              id="tour-leaderboard"
              onClick={onOpenLeaderboard}
              className="group relative cursor-pointer py-3 px-3.5 rounded-xl bg-gradient-to-b from-purple-600 via-purple-700 to-indigo-900 border-2 border-amber-300 shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_25px_rgba(168,85,247,0.8)] hover:scale-105 active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <Trophy className="w-4 h-4 text-amber-200" />
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white [text-shadow:_0_1px_0_#1e1b4b]">
                {t("leaderboard")}
              </span>
            </button>

            {/* SETTINGS BUTTON */}
            <button
              id="tour-settings"
              onClick={onOpenSettings}
              className="group relative cursor-pointer py-3 px-3.5 rounded-xl bg-gradient-to-b from-cyan-600 via-blue-700 to-slate-900 border-2 border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:shadow-[0_0_25px_rgba(34,211,238,0.8)] hover:scale-105 active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <Settings className="w-4 h-4 text-cyan-200" />
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white [text-shadow:_0_1px_0_#0f172a]">
                {t("settings")}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer hint & Discreet Legal Disclaimers */}
      <div className="flex flex-col items-center gap-2">
        <div
          id="tour-hint"
          className="text-center text-xs text-zinc-300 font-medium tracking-wide bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10"
        >
          {t("hintScale")}
        </div>

        <div className="flex items-center gap-2.5 text-[10px] text-zinc-400 font-medium tracking-wide flex-wrap justify-center">
          <span className="opacity-75">{t("legalDisclaimerFooter")}</span>
          <span className="opacity-40">•</span>
          <button
            onClick={() => setShowLegalModal(true)}
            className="text-zinc-400 hover:text-amber-300 transition underline underline-offset-2 cursor-pointer"
          >
            {t("legalTerms")}
          </button>
          <span className="opacity-40">•</span>
          <button
            onClick={() => setShowLegalModal(true)}
            className="text-zinc-400 hover:text-cyan-300 transition underline underline-offset-2 cursor-pointer"
          >
            {t("legalPrivacy")}
          </button>
        </div>
      </div>

      {/* Legal & Fair Use Modal */}
      <LegalModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
      />
    </div>
  );
}
