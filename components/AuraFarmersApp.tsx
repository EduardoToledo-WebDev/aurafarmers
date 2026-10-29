"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import SettingsModal from "@/components/layout/SettingsModal";
import LeaderboardModal from "@/components/leaderboard/LeaderboardModal";
import GameCanvas, { FloatingPoint } from "@/components/game/GameCanvas";
import CountdownOverlay from "@/components/game/CountdownOverlay";
import CameraPermissionScreen from "@/components/game/CameraPermissionScreen";
import MainMenu from "@/components/game/MainMenu";
import RoundSummaryModal from "@/components/game/RoundSummaryModal";
import { useCamera } from "@/hooks/useCamera";
import { useVisionModels } from "@/hooks/useVisionModels";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { sounds } from "@/lib/audio";
import { LeaderboardEntry, LeaderboardResponse } from "@/lib/leaderboard/types";

export type GameStage = "permission" | "main_menu" | "countdown" | "playing" | "summary";

export default function AuraFarmersApp() {
  // Hooks
  const { videoRef, cameraStatus, startCamera, stopCamera } = useCamera();
  const { handLandmarkerRef, faceDetectorRef, modelLoading, modelError, retryLoading } =
    useVisionModels();
  const {
    playlist,
    currentTrack,
    volume,
    setVolume,
    musicMuted,
    musicPlaying,
    toggleMusic,
    nextTrack,
    prevTrack,
    playTrack,
  } = useBackgroundMusic();
  const {
    playerId,
    nickname,
    recoveryKey,
    serverTotalPoints,
    addRoundScore,
    updateNickname,
    recoverProfile,
  } = usePlayerProfile();

  // Navigation stage flow
  const [stage, setStage] = useState<GameStage>("permission");

  // Persistent total points & active round points
  const [totalAuraPoints, setTotalAuraPoints] = useState<number>(0);
  const [roundPoints, setRoundPoints] = useState<number>(0);
  const roundPointsRef = useRef<number>(0);

  const [combo, setCombo] = useState<number>(0);
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([]);
  const [burstUntil, setBurstUntil] = useState<number>(0);

  // Round summary tracking
  const [roundPointsGained, setRoundPointsGained] = useState<number>(0);
  const [highestRoundCombo, setHighestRoundCombo] = useState<number>(0);
  const [startRank, setStartRank] = useState<number>(10);
  const [finalRank, setFinalRank] = useState<number>(10);

  // Inactivity tracking (15 seconds)
  const lastActivityTimeRef = useRef<number>(0);
  const [inactivityRemaining, setInactivityRemaining] = useState<number | null>(null);

  // Leaderboard data & Next rival tracker
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);

  // Modals state
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState<boolean>(false);

  const comboRef = useRef<number>(0);
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize stage based on camera permission
  useEffect(() => {
    if (cameraStatus === "granted") {
      setStage((prev) => (prev === "permission" ? "main_menu" : prev));
    } else if (cameraStatus === "denied") {
      setStage("permission");
    }
  }, [cameraStatus]);

  // Load points from localStorage on mount
  useEffect(() => {
    lastActivityTimeRef.current = Date.now();
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aurafarmers_points");
      if (saved) {
        setTotalAuraPoints(parseInt(saved, 10) || 0);
      }
    }
  }, []);

  // Sync server total points when loaded
  useEffect(() => {
    if (serverTotalPoints !== null && serverTotalPoints !== undefined) {
      setTotalAuraPoints((prev) => Math.max(prev, serverTotalPoints));
    }
  }, [serverTotalPoints]);

  // Save persistent total points to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("aurafarmers_points", totalAuraPoints.toString());
    }
  }, [totalAuraPoints]);

  // Fetch leaderboard to know player positions
  const refreshLeaderboard = useCallback(async () => {
    if (!playerId) return;
    try {
      const res = await fetch(`/api/leaderboard?playerId=${encodeURIComponent(playerId)}`);
      if (res.ok) {
        const data: LeaderboardResponse = await res.json();
        setLeaderboardData(data);
        if (data.currentUser) {
          setFinalRank(data.currentUser.rank);
        }
      }
    } catch {
      // Ignore background fetch error
    }
  }, [playerId]);

  useEffect(() => {
    refreshLeaderboard();
  }, [refreshLeaderboard]);

  // Current live points in the active game (total + round progression)
  const liveAuraPoints = totalAuraPoints + roundPoints;

  // Calculate next rival right above current player in the leaderboard
  const getNextRival = useCallback(() => {
    if (!leaderboardData || leaderboardData.topPlayers.length === 0) return null;
    const currentRank = leaderboardData.currentUser?.rank || leaderboardData.topPlayers.length + 1;

    if (currentRank <= 1) return null; // Already #1

    const rivalEntry: LeaderboardEntry | undefined = leaderboardData.topPlayers[currentRank - 2];
    if (!rivalEntry) return null;

    const pointsNeeded = Math.max(1, rivalEntry.points + 1 - liveAuraPoints);
    return {
      nickname: rivalEntry.nickname,
      rank: rivalEntry.rank,
      pointsNeeded,
    };
  }, [leaderboardData, liveAuraPoints]);

  const triggerFloatingParticle = useCallback((text: string, x: number, y: number) => {
    const newPoint: FloatingPoint = {
      id: Date.now() + Math.random(),
      text,
      x: Math.max(12, Math.min(88, x)),
      y: Math.max(15, Math.min(82, y)),
    };

    setFloatingPoints((prev) => [...prev.slice(-6), newPoint]);

    setTimeout(() => {
      setFloatingPoints((prev) => prev.filter((p) => p.id !== newPoint.id));
    }, 950);
  }, []);

  // Handle successful 6 7 detection during round
  const on67Achieved = useCallback(
    (xPercent: number, yPercent: number) => {
      if (stage !== "playing") return;

      // Reset inactivity timer
      lastActivityTimeRef.current = Date.now();
      setInactivityRemaining(null);

      comboRef.current += 1;
      const currentCombo = comboRef.current;
      setCombo(currentCombo);
      setHighestRoundCombo((prev) => Math.max(prev, currentCombo));

      const nextMultiplier = Math.min(5, 1 + Math.floor(currentCombo / 3));
      const addedPoints = 67 * nextMultiplier;

      // Accumulate round points
      roundPointsRef.current += addedPoints;
      setRoundPoints(roundPointsRef.current);

      setBurstUntil(performance.now() + 900);

      // Play sound effects
      if (currentCombo >= 2) {
        sounds.playComboSound(currentCombo);
        if (currentCombo === 3) {
          sounds.playLaserZap();
        }
      } else {
        sounds.play67Detected(nextMultiplier);
      }

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(currentCombo >= 3 ? [45, 20, 60] : 35);
      }

      const label =
        currentCombo >= 3
          ? `🔥 +${addedPoints} x${nextMultiplier}`
          : nextMultiplier > 1
          ? `⚡ +${addedPoints}`
          : `+67`;
      triggerFloatingParticle(label, xPercent, yPercent);

      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => {
        comboRef.current = 0;
        setCombo(0);
      }, 3200);
    },
    [stage, triggerFloatingParticle]
  );

  // Inactivity check (15 seconds without gestures)
  useEffect(() => {
    if (stage !== "playing") {
      setInactivityRemaining(null);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - lastActivityTimeRef.current) / 1000;
      const remaining = Math.max(0, Math.ceil(15 - elapsed));

      if (remaining <= 5) {
        setInactivityRemaining(remaining);
      } else {
        setInactivityRemaining(null);
      }

      if (elapsed >= 15) {
        // Automatically end round due to inactivity
        handleEndRound();
      }
    }, 500);

    return () => clearInterval(interval);
  });

  // Start round
  const handleStartRound = () => {
    roundPointsRef.current = 0;
    setRoundPoints(0);
    setHighestRoundCombo(0);
    lastActivityTimeRef.current = Date.now();

    // Capture starting rank
    const currentRk = leaderboardData?.currentUser?.rank || leaderboardData?.topPlayers.length || 10;
    setStartRank(currentRk);

    // Start background music if desired
    if (!musicPlaying && !musicMuted) {
      toggleMusic();
    }

    setStage("countdown");
  };

  // End round (via button or inactivity) - ACCUMULATES ROUND POINTS
  const handleEndRound = useCallback(async () => {
    const gained = roundPointsRef.current;
    setRoundPointsGained(gained);

    // Accumulate points to server if any points were gained
    if (gained > 0) {
      setTotalAuraPoints((prev) => prev + gained);
      await addRoundScore(gained, comboRef.current);
      // Immediately refresh leaderboard to display new accumulated rank
      await refreshLeaderboard();
    }

    setCombo(0);
    comboRef.current = 0;
    roundPointsRef.current = 0;
    setRoundPoints(0);
    setStage("summary");
  }, [addRoundScore, refreshLeaderboard]);

  const handleUpdateNickname = async (newName: string) => {
    const ok = await updateNickname(newName, totalAuraPoints);
    if (ok) refreshLeaderboard();
    return ok;
  };

  const handleRecoverAccount = async (key: string) => {
    const recovered = await recoverProfile(key);
    if (recovered) {
      setTotalAuraPoints(recovered.totalPoints);
      refreshLeaderboard();
      return true;
    }
    return false;
  };

  const isBlurred = stage === "main_menu" || stage === "countdown" || stage === "summary";

  return (
    <div className="relative h-screen w-screen bg-black text-white flex flex-col overflow-hidden select-none">
      {/* 1. CAMERA PERMISSION REQUIRED SCREEN */}
      {stage === "permission" && (
        <CameraPermissionScreen
          cameraStatus={cameraStatus}
          onEnableCamera={startCamera}
        />
      )}

      {/* 2. MAIN MENU (Centered with blurred background camera) */}
      {stage === "main_menu" && (
        <MainMenu
          onPlayClick={handleStartRound}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          musicMuted={musicMuted}
          musicPlaying={musicPlaying}
          onToggleMusic={toggleMusic}
          auraPoints={totalAuraPoints}
        />
      )}

      {/* 3. BLEND TOPBAR (Active during gameplay) */}
      {stage === "playing" && (
        <TopBar
          combo={combo}
          auraPoints={liveAuraPoints}
          nextRival={getNextRival()}
          inactivityRemaining={inactivityRemaining}
          onEndRound={handleEndRound}
          musicMuted={musicMuted}
          musicPlaying={musicPlaying}
          onToggleMusic={toggleMusic}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {/* 4. MAIN GAME & VISION CANVAS */}
      <GameCanvas
        videoRef={videoRef}
        cameraStatus={cameraStatus}
        modelLoading={modelLoading}
        modelError={modelError}
        combo={combo}
        isBlurred={isBlurred}
        handLandmarkerRef={handLandmarkerRef}
        faceDetectorRef={faceDetectorRef}
        floatingPoints={floatingPoints}
        burstUntil={burstUntil}
        on67Achieved={on67Achieved}
        onStartCamera={startCamera}
        onRetryModel={retryLoading}
      />

      {/* 5. COUNTDOWN OVERLAY (3... 2... 1... START FARMING!) */}
      <CountdownOverlay
        isActive={stage === "countdown"}
        onCountdownComplete={() => setStage("playing")}
      />

      {/* 6. ROUND SUMMARY & RESULTS MODAL */}
      <RoundSummaryModal
        isOpen={stage === "summary"}
        pointsGained={roundPointsGained}
        highestCombo={highestRoundCombo}
        startRank={startRank}
        finalRank={finalRank}
        nextRival={getNextRival()}
        onPlayAgain={handleStartRound}
        onBackToMenu={() => setStage("main_menu")}
      />

      {/* 7. SETTINGS MODAL */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        cameraStatus={cameraStatus}
        onStartCamera={startCamera}
        onStopCamera={stopCamera}
        currentTrack={currentTrack}
        playlist={playlist}
        volume={volume}
        onSetVolume={setVolume}
        musicMuted={musicMuted}
        musicPlaying={musicPlaying}
        onToggleMusic={toggleMusic}
        onNextTrack={nextTrack}
        onPrevTrack={prevTrack}
        onSelectTrack={playTrack}
        onOpenProfile={() => {
          setSettingsOpen(false);
          setLeaderboardOpen(true);
        }}
      />

      {/* 8. WEEKLY LEADERBOARD MODAL */}
      <LeaderboardModal
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        playerId={playerId}
        nickname={nickname}
        recoveryKey={recoveryKey}
        currentPoints={totalAuraPoints}
        onUpdateNickname={handleUpdateNickname}
        onRecoverAccount={handleRecoverAccount}
      />
    </div>
  );
}
