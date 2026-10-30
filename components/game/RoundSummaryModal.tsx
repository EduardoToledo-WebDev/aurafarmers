"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { Trophy, Flame, Play, ArrowLeft, TrendingUp, Crown, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface RoundSummaryModalProps {
  isOpen: boolean;
  pointsGained: number;
  highestCombo: number;
  coinsGained: number;
  totalCoins: number;
  startRank: number;
  finalRank: number;
  nextRival?: { nickname: string; rank: number; pointsNeeded: number } | null;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export default function RoundSummaryModal({
  isOpen,
  pointsGained,
  highestCombo,
  coinsGained,
  totalCoins,
  startRank,
  finalRank,
  nextRival,
  onPlayAgain,
  onBackToMenu,
}: RoundSummaryModalProps) {
  const ranksClimbed = Math.max(0, startRank - finalRank);
  const isNowTop1 = finalRank === 1;
  const { t } = useI18n();

  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 130,
          spread: 90,
          origin: { y: 0.5 },
          colors: ["#f59e0b", "#fb923c", "#22d3ee", "#c084fc", "#ffffff"],
        });
      } catch {
        // Ignore if confetti not supported
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl select-none animate-in fade-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-2 border-amber-400/60 p-6 sm:p-8 shadow-[0_0_40px_rgba(245,158,11,0.3)] flex flex-col items-center text-center space-y-6">
        {/* Glow ambient */}
        <div className="absolute -top-12 w-48 h-48 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

        {/* Header Icon */}
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-amber-500 to-orange-600 flex items-center justify-center shadow-[0_0_20px_rgba(251,146,60,0.7)]">
          {isNowTop1 ? (
            <Crown className="w-9 h-9 text-yellow-100 animate-bounce" />
          ) : (
            <Trophy className="w-9 h-9 text-yellow-100" />
          )}
        </div>

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-400 [text-shadow:_0_2px_0_#450a0a]">
            {t("roundCompleted")}
          </h2>
          <p className="text-xs text-zinc-400">{t("roundSummaryDesc")}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
              {t("auraEarned")}
            </span>
            <span className="text-lg sm:text-xl font-black font-mono text-cyan-400 mt-1">
              +{pointsGained.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] border border-yellow-400/30 flex flex-col items-center shadow-[0_0_15px_rgba(250,204,21,0.15)]">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase text-amber-300 tracking-wider">
              {t("coinsEarned")}
            </span>
            <span className="text-lg sm:text-xl font-black font-mono text-yellow-300 mt-1 flex items-center gap-1">
              <span>🟡</span>
              +{coinsGained.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
              {t("maxCombo")}
            </span>
            <span className="text-lg sm:text-xl font-black font-mono text-orange-400 mt-1 flex items-center gap-1">
              <Flame className="w-4 h-4 inline text-orange-400" />
              x{highestCombo}
            </span>
          </div>
        </div>

        {/* Rank Climbing Animation Banner */}
        <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-amber-950/30 to-purple-950/40 border border-amber-500/40 flex flex-col items-center space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> {t("leaderboardPosition")}
          </div>

          {ranksClimbed > 0 ? (
            <div className="flex flex-col items-center">
              <span className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                #{startRank} ➜ <span className="text-amber-400 text-xl font-mono">#{finalRank}</span>
              </span>
              <span className="text-xs font-bold text-emerald-400 mt-0.5">
                {t("climbedRanks", { n: ranksClimbed, s: ranksClimbed > 1 ? "s" : "" })}
              </span>
            </div>
          ) : isNowTop1 ? (
            <span className="text-base font-black text-amber-300">
              {t("stillNumberOne")}
            </span>
          ) : (
            <span className="text-sm font-bold text-zinc-300">
              {t("maintainedRank", { rank: finalRank })}
            </span>
          )}

          {nextRival && nextRival.pointsNeeded > 0 && (
            <span className="text-[11px] text-zinc-400 pt-1 font-mono flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" />
              {t("needMorePoints", {
                pts: nextRival.pointsNeeded.toLocaleString(),
                nick: nextRival.nickname,
                rank: nextRival.rank,
              })}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
          {/* MAIN MENU */}
          <button
            onClick={onBackToMenu}
            className="flex-1 cursor-pointer py-3.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-zinc-200 text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 hover:scale-102 active:scale-98"
          >
            <ArrowLeft className="w-4 h-4" /> {t("mainMenu")}
          </button>

          {/* PLAY AGAIN */}
          <button
            onClick={onPlayAgain}
            className="flex-1 cursor-pointer py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 border border-amber-300 text-white text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.5)] transition flex items-center justify-center gap-2 hover:scale-102 active:scale-98"
          >
            <Play className="w-4 h-4 fill-white" /> {t("playAgain")}
          </button>
        </div>
      </div>
    </div>
  );
}
