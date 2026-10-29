"use client";

import React, { useEffect, useState, useRef } from "react";
import confetti from "canvas-confetti";
import { sounds } from "@/lib/audio";
import { useI18n } from "@/lib/i18n";

interface CountdownOverlayProps {
  isActive: boolean;
  onCountdownComplete: () => void;
}

export default function CountdownOverlay({
  isActive,
  onCountdownComplete,
}: CountdownOverlayProps) {
  const [count, setCount] = useState<number | "GO">(3);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!isActive) {
      setCount(3);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Step 3
    setCount(3);
    sounds.playCountdownTick(3);

    timerRef.current = setTimeout(() => {
      // Step 2
      setCount(2);
      sounds.playCountdownTick(2);

      timerRef.current = setTimeout(() => {
        // Step 1
        setCount(1);
        sounds.playCountdownTick(1);

        timerRef.current = setTimeout(() => {
          // GO!
          setCount("GO");
          sounds.playCountdownGo();

          // Confetti blast
          try {
            confetti({
              particleCount: 130,
              spread: 90,
              origin: { y: 0.55 },
              colors: ["#fb923c", "#fde047", "#22d3ee", "#c084fc", "#ffffff"],
            });
          } catch {
            // Ignore if confetti not supported
          }

          timerRef.current = setTimeout(() => {
            onCountdownComplete();
          }, 900);
        }, 850);
      }, 850);
    }, 850);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive, onCountdownComplete]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div className="flex flex-col items-center justify-center space-y-4">
        {count !== "GO" ? (
          <div
            key={count}
            className={`text-9xl sm:text-[11rem] font-black italic tracking-tighter text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.9)] animate-in zoom-in-50 duration-300 ${
              count === 3
                ? "[text-shadow:_0_6px_0_#c2410c,_0_12px_0_#7c2d12,_0_0_40px_rgba(249,115,22,1)]"
                : count === 2
                ? "[text-shadow:_0_6px_0_#0284c7,_0_12px_0_#0369a1,_0_0_40px_rgba(34,211,238,1)]"
                : "[text-shadow:_0_6px_0_#7e22ce,_0_12px_0_#581c87,_0_0_40px_rgba(192,132,252,1)]"
            }`}
          >
            {count}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center animate-in zoom-in-75 duration-200 text-center px-4">
            <span className="text-4xl sm:text-7xl font-black uppercase tracking-wider text-white [text-shadow:_0_4px_0_#c2410c,_0_8px_0_#7c2d12,_0_0_35px_rgba(251,146,60,1)]">
              {t("startFarming")}
            </span>
            <span className="text-3xl sm:text-5xl font-black text-cyan-300 mt-2 font-mono tracking-widest animate-pulse [text-shadow:_0_0_20px_rgba(34,211,238,1)]">
              6 7
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
