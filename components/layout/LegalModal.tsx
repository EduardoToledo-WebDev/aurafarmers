"use client";

import React, { useState } from "react";
import { X, ShieldCheck, Scale, Music, EyeOff, Database } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LegalModal({ isOpen, onClose }: LegalModalProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-950/95 border border-white/20 p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-4 text-left animate-in zoom-in-95 duration-150 select-none max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-black uppercase tracking-wider text-zinc-100">
              {t("legalModalTitle")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition cursor-pointer p-1 rounded-lg hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-black/60 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab("terms")}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "terms"
                ? "bg-amber-500/25 text-amber-300 border border-amber-400/50 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{t("legalTabTerms")}</span>
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "privacy"
                ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>{t("legalTabPrivacy")}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto pr-1 space-y-4 text-xs text-zinc-300 leading-relaxed max-h-[60vh]">
          {activeTab === "terms" ? (
            <>
              {/* Academic & Fair Use Card */}
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <Scale className="w-4 h-4" />
                  <span>{t("legalFairUseTitle")}</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {t("legalFairUseText")}
                </p>
              </div>

              {/* Music Copyright Card */}
              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                  <Music className="w-4 h-4" />
                  <span>{t("legalCopyrightTitle")}</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {t("legalCopyrightText")}
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Camera Privacy Card */}
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                  <EyeOff className="w-4 h-4" />
                  <span>{t("legalPrivacyTitle")}</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {t("legalPrivacyText")}
                </p>
              </div>

              {/* Data & Storage Card */}
              <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                  <Database className="w-4 h-4" />
                  <span>{t("legalDataTitle")}</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {t("legalDataText")}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition cursor-pointer"
          >
            {t("legalClose")}
          </button>
        </div>
      </div>
    </div>
  );
}
