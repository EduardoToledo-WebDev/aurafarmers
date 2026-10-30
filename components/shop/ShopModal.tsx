"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import {
  X,
  Sparkles,
  ShoppingBag,
  Check,
  Lock,
  Layers,
  Crown,
  Flame,
  Zap,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  SHOP_CATALOG,
  ShopCategory,
  ShopItem,
} from "@/lib/shop/catalog";
import { PlayerEquipped } from "@/lib/leaderboard/types";

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  coins: number;
  unlockedItemIds: string[];
  equipped: PlayerEquipped;
  onBuyItem: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  onEquipItem: (
    slot: ShopCategory,
    itemId: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export default function ShopModal({
  isOpen,
  onClose,
  coins,
  unlockedItemIds,
  equipped,
  onBuyItem,
  onEquipItem,
}: ShopModalProps) {
  const { t, lang } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory | "all">("all");
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  if (!isOpen) return null;

  const filteredItems = SHOP_CATALOG.filter((item) => {
    if (selectedCategory === "all") return true;
    return item.category === selectedCategory;
  });

  const handleBuy = async (item: ShopItem) => {
    if (busyItemId) return;
    setBusyItemId(item.id);
    setFeedbackMsg(null);

    const res = await onBuyItem(item.id);
    setBusyItemId(null);

    if (res.success) {
      setFeedbackMsg({ text: t("buySuccess"), isError: false });
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#facc15", "#fb923c", "#38bdf8", "#e879f9"],
        });
      } catch {
        // Ignore
      }
    } else {
      setFeedbackMsg({
        text: res.error === "insufficient_coins" ? t("notEnoughCoins", { amount: item.price - coins }) : "Error",
        isError: true,
      });
    }
  };

  const handleEquip = async (item: ShopItem) => {
    if (busyItemId) return;
    setBusyItemId(item.id);
    setFeedbackMsg(null);

    const res = await onEquipItem(item.category, item.id);
    setBusyItemId(null);

    if (res.success) {
      setFeedbackMsg({ text: t("equipSuccess"), isError: false });
    }
  };

  const getRarityBadge = (rarity: ShopItem["rarity"]) => {
    switch (rarity) {
      case "legendary":
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-300 text-black shadow-[0_0_10px_rgba(250,204,21,0.6)]">
            LEGENDARY
          </span>
        );
      case "epic":
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.6)]">
            EPIC
          </span>
        );
      case "rare":
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-cyan-600 to-blue-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.6)]">
            RARE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-zinc-700 text-zinc-300">
            COMMON
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-2 border-amber-400/50 shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden">
        {/* Top Header */}
        <div className="relative p-5 sm:p-6 flex items-center justify-between border-b border-white/10 shrink-0 bg-gradient-to-r from-amber-950/30 via-zinc-900 to-purple-950/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-500 to-orange-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.6)]">
              <ShoppingBag className="w-6 h-6 text-yellow-100" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-400 [text-shadow:_0_1px_0_#450a0a]">
                {t("shopTitle")}
              </h2>
              <p className="text-xs text-zinc-400 hidden sm:block">
                {t("shopSubtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Coins Balance Chip */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-2 border-yellow-400/80 shadow-[0_0_20px_rgba(250,204,21,0.4)]">
              <span className="text-lg">🟡</span>
              <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] font-bold text-amber-200/80 uppercase tracking-wider">
                  {t("coins")}
                </span>
                <span className="text-base sm:text-lg font-black font-mono text-yellow-300">
                  {coins.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="px-5 py-3 border-b border-white/10 bg-zinc-900/60 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === "all"
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-yellow-300"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {t("categoryAll")}
            </button>

            <button
              onClick={() => setSelectedCategory("gloves")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === "gloves"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(34,211,238,0.5)] border border-cyan-300"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <span>🧤</span>
              {t("categoryGloves")}
            </button>

            <button
              onClick={() => setSelectedCategory("head")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === "head"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-300"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              {t("categoryHead")}
            </button>

            <button
              onClick={() => setSelectedCategory("aura")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === "aura"
                  ? "bg-gradient-to-r from-orange-600 to-rose-600 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)] border border-orange-300"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              {t("categoryAura")}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{t("needMoreCoinsHint")}</span>
          </div>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div
            className={`px-4 py-2 text-center text-xs font-bold transition-all ${
              feedbackMsg.isError
                ? "bg-rose-950/80 text-rose-300 border-b border-rose-500/40"
                : "bg-emerald-950/80 text-emerald-300 border-b border-emerald-500/40"
            }`}
          >
            {feedbackMsg.text}
          </div>
        )}

        {/* Item Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[calc(92vh-170px)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const isUnlocked = unlockedItemIds.includes(item.id) || item.price === 0;
              const isEquipped = equipped[item.category] === item.id;
              const canAfford = coins >= item.price;
              const itemName = lang === "es" ? item.nameEs : item.nameEn;
              const itemDesc = lang === "es" ? item.descEs : item.descEn;

              return (
                <div
                  key={item.id}
                  className={`relative rounded-2xl border transition-all duration-200 flex flex-col justify-between p-4 ${
                    isEquipped
                      ? "bg-gradient-to-b from-emerald-950/40 via-zinc-900 to-black border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      : isUnlocked
                      ? "bg-zinc-900/80 hover:bg-zinc-800/80 border-white/15 hover:border-cyan-400/50"
                      : canAfford
                      ? "bg-zinc-900/80 hover:bg-zinc-800/80 border-amber-400/40 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                      : "bg-zinc-950/60 border-white/5 opacity-70"
                  }`}
                >
                  {/* Top card row: Rarity & Category */}
                  <div className="flex items-center justify-between mb-3">
                    {getRarityBadge(item.rarity)}
                    <span className="text-[10px] uppercase font-bold text-zinc-500">
                      {item.category}
                    </span>
                  </div>

                  {/* Icon & Glow */}
                  <div className="my-2 flex flex-col items-center justify-center">
                    <div
                      className="relative w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-inner transition-transform duration-300 hover:scale-110"
                      style={{
                        backgroundColor: `${item.accentColor}18`,
                        border: `1.5px solid ${item.accentColor}60`,
                        boxShadow: `0 0 25px ${item.accentColor}30`,
                      }}
                    >
                      <span>{item.icon}</span>
                      {isEquipped && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center font-black text-xs shadow-lg">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <h3 className="mt-3 text-base font-black text-white text-center">
                      {itemName}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-400 text-center line-clamp-2 h-8 leading-tight">
                      {itemDesc}
                    </p>
                  </div>

                  {/* Action Button & Price */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    {isEquipped ? (
                      <div className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                        <Check className="w-4 h-4" />
                        {t("equipped")}
                      </div>
                    ) : isUnlocked ? (
                      <button
                        onClick={() => handleEquip(item)}
                        disabled={busyItemId === item.id}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-300 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:scale-102 active:scale-98 flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {t("equip")}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuy(item)}
                        disabled={!canAfford || busyItemId === item.id}
                        className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                          canAfford
                            ? "bg-gradient-to-b from-amber-500 via-orange-600 to-rose-600 border border-yellow-300 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer hover:scale-102 active:scale-98"
                            : "bg-zinc-800 border border-zinc-700 text-zinc-400 cursor-not-allowed"
                        }`}
                      >
                        {canAfford ? (
                          <>
                            <span>{t("buy")}</span>
                            <span className="flex items-center gap-1 font-mono text-yellow-200">
                              🟡 {item.price.toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="font-mono">🟡 {item.price.toLocaleString()}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
