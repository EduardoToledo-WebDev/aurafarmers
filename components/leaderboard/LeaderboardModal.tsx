"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Trophy,
  X,
  Crown,
  Sparkles,
  Flame,
  Key,
  Copy,
  Check,
  RefreshCw,
  User,
  ShieldCheck,
} from "lucide-react";
import { LeaderboardResponse } from "@/lib/leaderboard/types";
import { useI18n } from "@/lib/i18n";

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  nickname: string;
  recoveryKey: string;
  currentPoints: number;
  onUpdateNickname: (newName: string) => Promise<boolean>;
  onRecoverAccount: (key: string) => Promise<boolean>;
}

export default function LeaderboardModal({
  isOpen,
  onClose,
  playerId,
  nickname,
  recoveryKey,
  currentPoints,
  onUpdateNickname,
  onRecoverAccount,
}: LeaderboardModalProps) {
  const { t } = useI18n();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"ranking" | "profile">("ranking");

  // Profile edit states
  const [editingNick, setEditingNick] = useState<string>(nickname);
  const [savingNick, setSavingNick] = useState<boolean>(false);
  const [nickSuccess, setNickSuccess] = useState<boolean>(false);

  // Recovery states
  const [inputKey, setInputKey] = useState<string>("");
  const [recovering, setRecovering] = useState<boolean>(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<boolean>(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/leaderboard?playerId=${encodeURIComponent(playerId)}`);
      if (res.ok) {
        const json: LeaderboardResponse = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error loading leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    if (isOpen) {
      setEditingNick(nickname);
      fetchLeaderboard();
    }
  }, [isOpen, nickname, fetchLeaderboard]);

  if (!isOpen) return null;

  const handleCopyKey = () => {
    if (!recoveryKey) return;
    navigator.clipboard.writeText(recoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNick.trim() || savingNick) return;
    setSavingNick(true);
    setNickSuccess(false);

    const ok = await onUpdateNickname(editingNick.trim());
    setSavingNick(false);
    if (ok) {
      setNickSuccess(true);
      fetchLeaderboard();
      setTimeout(() => setNickSuccess(false), 2500);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim() || recovering) return;
    setRecovering(true);
    setRecoveryError(null);
    setRecoverySuccess(false);

    const ok = await onRecoverAccount(inputKey.trim());
    setRecovering(false);
    if (ok) {
      setRecoverySuccess(true);
      setInputKey("");
      fetchLeaderboard();
      setTimeout(() => setRecoverySuccess(false), 3000);
    } else {
      setRecoveryError(t("restoreError"));
    }
  };

  const top3 = data?.topPlayers.slice(0, 3) || [];
  const restPlayers = data?.topPlayers.slice(3) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-zinc-950 border border-white/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-white flex items-center gap-2">
                {t("weeklyLeaderboard")}
                {data?.week && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                    {data.week}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {t("weeklyDesc")}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-1.5 mx-5 mt-3 bg-white/5 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab("ranking")}
            className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "ranking"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Crown className="w-3.5 h-3.5" /> {t("tabLeaderboard")}
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "profile"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <User className="w-3.5 h-3.5" /> {t("tabProfile")}
          </button>
        </div>

        {/* Tab Content: Ranking */}
        {activeTab === "ranking" && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                <span className="text-xs">{t("loadingScores")}</span>
              </div>
            ) : data && data.topPlayers.length > 0 ? (
              <>
                {/* Podium Top 3 */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2 pb-1">
                  {/* Rank 2 */}
                  {top3[1] && (
                    <div className="flex flex-col items-center justify-end p-2 sm:p-3 rounded-2xl bg-zinc-900/80 border border-zinc-700/60 relative">
                      <span className="text-xl">🥈</span>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 mt-1">
                        #2
                      </span>
                      <span className="text-xs font-bold text-white truncate max-w-full text-center">
                        {top3[1].nickname}
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-cyan-400 mt-0.5">
                        +{top3[1].points.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Rank 1 (Center) */}
                  {top3[0] && (
                    <div className="flex flex-col items-center justify-end p-2.5 sm:p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/50 relative shadow-lg shadow-amber-500/10">
                      <div className="absolute -top-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-black">
                        <Crown className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-2xl mt-1">🥇</span>
                      <span className="text-[10px] uppercase font-bold text-amber-300 mt-1">
                        {t("champion")}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-amber-200 truncate max-w-full text-center">
                        {top3[0].nickname}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                        +{top3[0].points.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Rank 3 */}
                  {top3[2] && (
                    <div className="flex flex-col items-center justify-end p-2 sm:p-3 rounded-2xl bg-zinc-900/80 border border-amber-800/40 relative">
                      <span className="text-xl">🥉</span>
                      <span className="text-[10px] uppercase font-bold text-amber-700 mt-1">
                        #3
                      </span>
                      <span className="text-xs font-bold text-white truncate max-w-full text-center">
                        {top3[2].nickname}
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-cyan-400 mt-0.5">
                        +{top3[2].points.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Rest of the leaderboard list */}
                {restPlayers.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {restPlayers.map((entry) => {
                      const isMe = entry.playerId === playerId;
                      return (
                        <div
                          key={entry.playerId}
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition ${
                            isMe
                              ? "bg-cyan-950/40 border-cyan-500/50 text-white"
                              : "bg-white/[0.02] border-white/5 text-zinc-300 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 text-center text-xs font-mono font-bold text-zinc-500">
                              #{entry.rank}
                            </span>
                            <span className="text-base">{entry.rankEmoji}</span>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                {entry.nickname}
                                {isMe && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 uppercase">
                                    {t("you")}
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-zinc-500">
                                {entry.rankTitle}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {entry.highestCombo >= 2 && (
                              <span className="text-[10px] text-orange-400 font-mono font-semibold flex items-center">
                                <Flame className="w-3 h-3 inline mr-0.5" />
                                x{entry.highestCombo}
                              </span>
                            )}
                            <span className="text-xs font-mono font-bold text-cyan-400">
                              +{entry.points.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="py-16 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-cyan-400 mx-auto opacity-70" />
                <p className="text-xs font-bold text-zinc-300">
                  {t("noScoresYet")}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {t("beTheFirst")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Profile & Recovery Key */}
        {activeTab === "profile" && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Nickname Editor */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" /> {t("yourNicknameTitle")}
              </span>
              <form onSubmit={handleSaveNickname} className="flex gap-2">
                <input
                  type="text"
                  value={editingNick}
                  onChange={(e) => setEditingNick(e.target.value)}
                  maxLength={20}
                  placeholder={t("nicknamePlaceholder")}
                  className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={savingNick || !editingNick.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {savingNick ? t("saving") : t("save")}
                </button>
              </form>
              {nickSuccess && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {t("nicknameUpdated")}
                </p>
              )}
            </div>

            {/* Recovery Key Card */}
            <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-purple-400" /> {t("secretKeyTitle")}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  {t("saveThisKey")}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {t("secretKeyDesc")}
              </p>
              <div className="flex items-center justify-between bg-black/70 border border-purple-500/40 rounded-xl px-3 py-2">
                <code className="text-xs font-mono font-bold text-purple-200 tracking-wider">
                  {recoveryKey || "Generando..."}
                </code>
                <button
                  onClick={handleCopyKey}
                  className="flex items-center gap-1 text-[11px] font-semibold text-purple-300 hover:text-white px-2 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> {t("copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> {t("copy")}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Recover Profile Form */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> {t("restoreAccountTitle")}
              </span>
              <p className="text-[11px] text-zinc-400">
                {t("restoreAccountDesc")}
              </p>
              <form onSubmit={handleRecover} className="flex gap-2">
                <input
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                  placeholder={t("keyPlaceholder")}
                  className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono uppercase text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={recovering || !inputKey.trim()}
                  className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {recovering ? t("restoring") : t("restore")}
                </button>
              </form>
              {recoveryError && (
                <p className="text-[11px] text-rose-400">{recoveryError}</p>
              )}
              {recoverySuccess && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {t("restoreSuccess")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer: User rank summary */}
        {activeTab === "ranking" && (
          <div className="p-3.5 border-t border-white/10 bg-zinc-900/90 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-xs font-bold font-mono">
                {data?.currentUser ? `#${data.currentUser.rank}` : "—"}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  {nickname}
                  <span className="text-[10px] text-zinc-400 font-normal">
                    {t("yourPosition")}
                  </span>
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {currentPoints.toLocaleString()} {t("auraPointsSuffix")}
                </span>
              </div>
            </div>

            <button
              onClick={fetchLeaderboard}
              title="Refresh"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
