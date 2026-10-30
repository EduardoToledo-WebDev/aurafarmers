"use client";

import React from "react";
import Image from "next/image";
import {
  Flame,
  Zap,
  Square,
  Trophy,
  Volume2,
  VolumeX,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface NextRival {
  nickname: string;
  rank: number;
  pointsNeeded: number;
}

interface TopBarProps {
  combo: number;
  auraPoints: number;
  coins: number;
  nextRival?: NextRival | null;
  inactivityRemaining?: number | null;
  onEndRound: () => void;
  musicMuted: boolean;
  musicPlaying: boolean;
  onToggleMusic: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
}

export default function TopBar({
  combo,
  auraPoints,
  coins,
  nextRival,
  inactivityRemaining,
  onEndRound,
  musicMuted,
  musicPlaying,
  onToggleMusic,
  onOpenShop,
  onOpenLeaderboard,
  onOpenSettings,
}: TopBarProps) {
  const { t } = useI18n();

  return (
    <header className="absolute top-0 inset-x-0 z-30 pt-3 pb-8 px-4 sm:px-6 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/30 to-transparent pointer-events-none select-none transition-all duration-300">
      {/* Left: Floating Brand & Aura Points & Coins */}
      <div className="flex items-center gap-2.5 pointer-events-auto flex-wrap">
        <div className="relative h-9 sm:h-11 w-28 sm:w-36 flex items-center">
          <Image
            src="/logo.png"
            alt="Aura Farmers 67"
            fill
            priority
            className="object-contain drop-shadow-[0_0_12px_rgba(251,146,60,0.8)]"
          />
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-mono font-bold text-amber-300 shadow-md">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>{auraPoints.toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-yellow-400/50 text-xs font-mono font-bold text-yellow-300 shadow-md">
          <span>🟡</span>
          <span>{coins.toLocaleString()}</span>
        </div>

        {combo >= 2 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-600/70 to-rose-600/70 border border-orange-400/80 text-xs font-black text-yellow-300 animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.7)]">
            <Flame className="w-3.5 h-3.5 text-orange-300 animate-bounce" />
            <span>x{combo}</span>
          </div>
        )}
      </div>

      {/* Center: Inactivity Warning only when active (leaves center free for Overdrive badge) */}
      <div className="hidden md:flex flex-col items-center pointer-events-auto">
        {inactivityRemaining !== null && inactivityRemaining !== undefined && inactivityRemaining <= 5 && (
          <div className="px-3.5 py-1 rounded-full bg-rose-600 border-2 border-yellow-300 text-white text-[11px] font-black animate-pulse shadow-lg">
            {t("inactivityWarning", { s: inactivityRemaining })}
          </div>
        )}
      </div>

      {/* Right: Compact Leaderboard Rank Badge + Controls & End Round Button */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Compact Leaderboard Rank / Rival Tracker Badge */}
        {nextRival && nextRival.pointsNeeded > 0 ? (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-cyan-400/40 text-[11px] shadow-sm">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-zinc-200 truncate max-w-[200px]">
              +{nextRival.pointsNeeded.toLocaleString()} vs #{nextRival.rank} {nextRival.nickname}
            </span>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-400/50 text-amber-200 text-[11px] font-bold shadow-sm">
            <span className="text-xs">👑</span>
            <span>{t("leadingRank1")}</span>
          </div>
        )}

        {/* Audio Toggle */}
        <button
          onClick={onToggleMusic}
          title={musicMuted || !musicPlaying ? "Unmute" : "Mute"}
          className="p-2 rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white transition cursor-pointer"
        >
          {musicMuted || !musicPlaying ? (
            <VolumeX className="w-4 h-4 text-zinc-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-cyan-400" />
          )}
        </button>

        {/* Quick Shop */}
        <button
          onClick={onOpenShop}
          title={t("shop")}
          className="p-2 rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur-md border border-emerald-400/40 text-emerald-300 transition cursor-pointer hover:border-emerald-300"
        >
          <ShoppingBag className="w-4 h-4" />
        </button>

        {/* Quick Leaderboard */}
        <button
          onClick={onOpenLeaderboard}
          title={t("leaderboard")}
          className="p-2 rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-amber-300 transition cursor-pointer"
        >
          <Trophy className="w-4 h-4" />
        </button>

        {/* Quick Settings */}
        <button
          onClick={onOpenSettings}
          title={t("settings")}
          className="p-2 rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-zinc-200 transition cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* END ROUND BUTTON */}
        <button
          onClick={onEndRound}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-b from-rose-600 to-red-800 border-2 border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.6)] hover:scale-105 active:scale-95 transition cursor-pointer"
        >
          <Square className="w-3.5 h-3.5 fill-white text-white" />
          <span className="text-xs font-black uppercase tracking-wider text-white [text-shadow:_0_1px_0_#450a0a]">
            {t("endRound")}
          </span>
        </button>
      </div>
    </header>
  );
}
