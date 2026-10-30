"use client";

import React from "react";
import {
  Camera,
  CameraOff,
  RefreshCw,
  X,
  Volume2,
  VolumeX,
  Volume1,
  User,
  Globe,
  SkipForward,
  SkipBack,
  Music,
  RotateCcw,
  AlertTriangle,
  Check,
} from "lucide-react";
import { CameraStatus } from "@/hooks/useCamera";
import { Track } from "@/hooks/useBackgroundMusic";
import { useI18n } from "@/lib/i18n";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameraStatus: CameraStatus;
  onStartCamera: () => void;
  onStopCamera: () => void;
  // Audio Controls
  currentTrack: Track;
  playlist: Track[];
  volume: number;
  onSetVolume: (vol: number) => void;
  musicMuted: boolean;
  musicPlaying: boolean;
  onToggleMusic: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onSelectTrack: (index: number) => void;
  onOpenProfile: () => void;
  // Rebirth
  nickname: string;
  onRebirth: (nickname: string) => Promise<{ success: boolean; error?: string }>;
}

export default function SettingsModal({
  isOpen,
  onClose,
  cameraStatus,
  onStartCamera,
  onStopCamera,
  currentTrack,
  playlist,
  volume,
  onSetVolume,
  musicMuted,
  onToggleMusic,
  onNextTrack,
  onPrevTrack,
  onSelectTrack,
  onOpenProfile,
  nickname,
  onRebirth,
}: SettingsModalProps) {
  const { lang, setLang, t } = useI18n();
  const [showRebirthModal, setShowRebirthModal] = React.useState(false);
  const [confirmInput, setConfirmInput] = React.useState("");
  const [isRebirthing, setIsRebirthing] = React.useState(false);
  const [rebirthError, setRebirthError] = React.useState<string | null>(null);
  const [rebirthSuccess, setRebirthSuccess] = React.useState(false);

  const isMatch =
    confirmInput.trim().toLowerCase() === nickname.trim().toLowerCase() &&
    confirmInput.trim().length > 0;

  const handleExecuteRebirth = async () => {
    if (!isMatch || isRebirthing) return;
    setIsRebirthing(true);
    setRebirthError(null);

    const res = await onRebirth(confirmInput.trim());
    setIsRebirthing(false);

    if (res.success) {
      setRebirthSuccess(true);
      setTimeout(() => {
        setRebirthSuccess(false);
        setShowRebirthModal(false);
        setConfirmInput("");
        onClose();
      }, 1800);
    } else {
      setRebirthError(t("rebirthMismatchError"));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-16 right-5 z-50 w-84 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-white/20 p-4 shadow-2xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-150 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
          {t("settingsTitle")}
        </span>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition cursor-pointer p-1"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Language Selector */}
      <div className="space-y-1.5 py-1">
        <span className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-cyan-400" /> {t("language")}
        </span>
        <div className="grid grid-cols-2 gap-2 p-1 bg-black/60 rounded-xl border border-white/10">
          <button
            onClick={() => setLang("en")}
            className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              lang === "en"
                ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/60 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            🇺🇸 English (US)
          </button>
          <button
            onClick={() => setLang("es")}
            className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              lang === "es"
                ? "bg-amber-500/30 text-amber-200 border border-amber-400/60 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            🇲🇽 Español
          </button>
        </div>
      </div>

      {/* Music Player & Track Switcher */}
      <div className="space-y-2.5 border-t border-white/10 pt-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-amber-400" /> {t("backgroundMusic")}
          </span>
          <button
            onClick={onToggleMusic}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
              musicMuted
                ? "bg-zinc-800 border-zinc-700 text-zinc-400"
                : "bg-cyan-500/25 border-cyan-500/50 text-cyan-300"
            }`}
          >
            {musicMuted ? (
              <>
                <VolumeX className="w-3 h-3" /> {t("muted")}
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3" /> {t("active")}
              </>
            )}
          </button>
        </div>

        {/* Current Track Card with Skip Controls */}
        <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                {t("nowPlaying")}
              </span>
              <span className="text-xs font-black text-white truncate">
                {currentTrack.title}
              </span>
              <span className="text-[10px] text-zinc-400 truncate">
                {currentTrack.artist}
              </span>
            </div>

            {/* Prev / Next Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onPrevTrack}
                title={t("prevSong")}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white border border-white/10 transition cursor-pointer active:scale-95"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onNextTrack}
                title={t("nextSong")}
                className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 transition cursor-pointer active:scale-95"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Playlist selector pills */}
          <div className="grid grid-cols-3 gap-1 pt-1 border-t border-white/5">
            {playlist.map((track, idx) => {
              const isCurrent = track.id === currentTrack.id;
              return (
                <button
                  key={track.id}
                  onClick={() => onSelectTrack(idx)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold truncate transition cursor-pointer ${
                    isCurrent
                      ? "bg-amber-500/30 text-amber-300 border border-amber-400/50"
                      : "bg-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
                  }`}
                  title={`${track.title} - ${track.artist}`}
                >
                  {track.id.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Volume Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              {volume === 0 || musicMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              )}
              {t("musicVolume")}
            </span>
            <span className="font-mono text-zinc-300 font-bold">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onSetVolume(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>
      </div>

      {/* Camera On/Off Toggle */}
      <div className="flex items-center justify-between py-1 border-t border-white/10 pt-2.5">
        <span className="text-xs text-zinc-200 font-medium">{t("camera")}</span>
        {cameraStatus === "granted" ? (
          <button
            onClick={onStopCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/25 hover:bg-rose-500/35 border border-rose-500/50 text-rose-300 text-xs font-semibold transition cursor-pointer"
          >
            <CameraOff className="w-3.5 h-3.5" /> {t("disable")}
          </button>
        ) : (
          <button
            onClick={onStartCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-500/50 text-cyan-300 text-xs font-semibold transition cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" /> {t("enable")}
          </button>
        )}
      </div>

      {/* Profile & Recovery Shortcut */}
      <button
        onClick={() => {
          onClose();
          onOpenProfile();
        }}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-200 text-xs font-semibold transition cursor-pointer mt-1"
      >
        <User className="w-3.5 h-3.5" /> {t("profileAndKey")}
      </button>

      {/* Reconnect Camera Button */}
      <button
        onClick={onStartCamera}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" /> {t("reconnectCamera")}
      </button>

      {/* Rebirth / Renacer Section */}
      <div className="border-t border-rose-500/20 pt-2">
        <button
          onClick={() => {
            setConfirmInput("");
            setRebirthError(null);
            setRebirthSuccess(false);
            setShowRebirthModal(true);
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-950/60 via-red-900/40 to-amber-950/60 hover:from-rose-900/80 hover:to-amber-900/80 border border-rose-500/50 text-rose-300 hover:text-rose-100 text-xs font-bold transition cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.2)] hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
          <span>{t("rebirth")}</span>
        </button>
      </div>

      {/* REBIRTH CONFIRMATION MODAL OVERLAY */}
      {showRebirthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-zinc-950 border-2 border-rose-500/60 p-5 sm:p-6 shadow-[0_0_50px_rgba(225,29,72,0.4)] flex flex-col gap-4 text-center animate-in zoom-in-95 duration-150">
            {/* Warning Icon Badge */}
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/20 border-2 border-rose-400/60 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.5)]">
              <AlertTriangle className="w-6 h-6 text-rose-400 animate-bounce" />
            </div>

            {/* Modal Title */}
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-rose-200">
                {t("rebirthModalTitle")}
              </h3>
              <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                {t("rebirthWarning")}
              </p>
            </div>

            {/* Rebirth details */}
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-[11px] text-zinc-300">
              {t("rebirthKeepNote")}
            </div>

            {/* Nickname verification challenge */}
            <div className="space-y-2 text-left">
              <span className="text-xs text-zinc-300 font-medium">
                {t("rebirthConfirmPrompt")}
              </span>
              <div className="px-3 py-1.5 rounded-lg bg-black/80 border border-rose-400/40 text-center font-mono font-bold text-rose-300 text-sm select-all">
                {nickname}
              </div>

              <input
                type="text"
                value={confirmInput}
                onChange={(e) => {
                  setConfirmInput(e.target.value);
                  setRebirthError(null);
                }}
                placeholder={t("rebirthTypePlaceholder")}
                autoFocus
                className="w-full px-3 py-2 rounded-xl bg-black/70 border border-white/20 focus:border-rose-400 text-white font-mono text-center text-xs tracking-wider outline-none transition placeholder:text-zinc-500"
              />

              {rebirthError && (
                <div className="text-[11px] text-rose-400 font-semibold text-center">
                  {rebirthError}
                </div>
              )}

              {rebirthSuccess && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-bold">
                  <Check className="w-4 h-4" />
                  <span>{t("rebirthSuccess")}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowRebirthModal(false);
                  setConfirmInput("");
                  setRebirthError(null);
                }}
                disabled={isRebirthing}
                className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition cursor-pointer"
              >
                {t("rebirthCancelBtn")}
              </button>

              <button
                type="button"
                onClick={handleExecuteRebirth}
                disabled={!isMatch || isRebirthing || rebirthSuccess}
                className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  isMatch && !isRebirthing && !rebirthSuccess
                    ? "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.6)] cursor-pointer"
                    : "bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60"
                }`}
              >
                {isRebirthing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>{t("rebirthConfirmBtn")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
