"use client";

import React, { useEffect, useState, useRef } from "react";
import { Zap, Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface OverdriveEnergyBarProps {
  energyPercent: number; // 0 to 100
  isReady: boolean;
  isOverdriveActive: boolean;
  overdriveUntil: number; // timestamp in ms
  overdriveDurationMs?: number;
  cooldownUntil: number; // timestamp in ms
  cooldownDurationMs?: number;
}

export default function OverdriveEnergyBar({
  energyPercent,
  isReady,
  isOverdriveActive,
  overdriveUntil,
  overdriveDurationMs = 7500,
  cooldownUntil,
  cooldownDurationMs = 20000,
}: OverdriveEnergyBarProps) {
  const { t } = useI18n();

  // Smooth continuous fluid fractions (0.0 to 1.0) updated at 60fps via rAF
  const [fluidOverdrivePct, setFluidOverdrivePct] = useState<number>(0);
  const [fluidCooldownPct, setFluidCooldownPct] = useState<number>(0);
  const [displaySeconds, setDisplaySeconds] = useState<number>(0);

  const rAFRef = useRef<number | null>(null);

  useEffect(() => {
    const updateFluid = () => {
      const now = Date.now();

      // Overdrive draining
      if (overdriveUntil > now) {
        const leftMs = Math.max(0, overdriveUntil - now);
        const pct = (leftMs / overdriveDurationMs) * 100;
        setFluidOverdrivePct(pct);
        setDisplaySeconds(Math.ceil(leftMs / 1000));
      } else {
        setFluidOverdrivePct(0);
      }

      // Cooldown draining
      if (cooldownUntil > now) {
        const leftMs = Math.max(0, cooldownUntil - now);
        const pct = (leftMs / cooldownDurationMs) * 100;
        setFluidCooldownPct(pct);
        setDisplaySeconds(Math.ceil(leftMs / 1000));
      } else {
        setFluidCooldownPct(0);
      }

      if (overdriveUntil > now || cooldownUntil > now) {
        rAFRef.current = requestAnimationFrame(updateFluid);
      }
    };

    if (overdriveUntil > Date.now() || cooldownUntil > Date.now()) {
      rAFRef.current = requestAnimationFrame(updateFluid);
    }

    return () => {
      if (rAFRef.current) {
        cancelAnimationFrame(rAFRef.current);
      }
    };
  }, [overdriveUntil, overdriveDurationMs, cooldownUntil, cooldownDurationMs]);

  const inCooldown = cooldownUntil > Date.now();

  return (
    <div className="fixed top-0 inset-x-0 z-40 pointer-events-none select-none flex flex-col items-center">
      {/* 1. Ultra-fine top bar (h-1 sm:h-1.5) with liquid-smooth filling and draining */}
      <div className="w-full h-1 sm:h-1.5 bg-black/50 backdrop-blur-xs relative overflow-hidden">
        {/* Background track indicator */}
        <div className="absolute inset-0 bg-white/5" />

        {inCooldown ? (
          <div
            style={{ width: `${fluidCooldownPct}%` }}
            className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
          />
        ) : isOverdriveActive ? (
          <div
            style={{ width: `${fluidOverdrivePct}%` }}
            className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-rose-500 shadow-[0_0_12px_rgba(250,204,21,1)]"
          />
        ) : isReady ? (
          <div className="w-full h-full bg-gradient-to-r from-yellow-300 via-amber-400 to-cyan-300 animate-pulse shadow-[0_0_12px_rgba(250,204,21,1)]" />
        ) : (
          <div
            style={{
              width: `${Math.min(100, Math.max(0, energyPercent))}%`,
              transition: "width 350ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
            className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
          />
        )}
      </div>

      {/* 2. Discreet subtle floating badge only when Ready, Overdrive Active, or in Cooldown */}
      <div className="mt-1 flex items-center justify-center pointer-events-none">
        {inCooldown ? (
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-cyan-500/40 text-[10px] sm:text-xs font-mono font-bold text-cyan-300 shadow-md">
            <Lock className="w-3 h-3 text-cyan-400" />
            <span>{t("overdriveCooldown", { s: displaySeconds })}</span>
          </div>
        ) : isOverdriveActive ? (
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-600 to-amber-500 border border-yellow-300 text-white text-[10px] sm:text-xs font-black animate-pulse shadow-[0_0_20px_rgba(250,204,21,0.9)]">
            <Zap className="w-3.5 h-3.5 text-yellow-200 animate-bounce" />
            <span>{t("overdriveActive", { mult: 5, s: displaySeconds })}</span>
          </div>
        ) : isReady ? (
          <div className="flex items-center gap-1.5 px-3.5 py-0.5 rounded-full bg-gradient-to-b from-amber-500 to-orange-600 border-2 border-yellow-300 text-white text-[10px] sm:text-xs font-black animate-bounce shadow-[0_0_20px_rgba(250,204,21,0.9)]">
            <Zap className="w-3.5 h-3.5 text-yellow-100" />
            <span>{t("overdriveReady")}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
