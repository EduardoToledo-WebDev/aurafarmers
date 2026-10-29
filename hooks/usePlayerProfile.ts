"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Player } from "@/lib/leaderboard/types";

function getOrCreatePlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("aurafarmers_player_id");
  if (!id) {
    id = "usr_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    localStorage.setItem("aurafarmers_player_id", id);
  }
  return id;
}

export function usePlayerProfile() {
  const [playerId, setPlayerId] = useState<string>("");
  const [nickname, setNickname] = useState<string>("AuraFarmer");
  const [recoveryKey, setRecoveryKey] = useState<string>("");
  const [serverTotalPoints, setServerTotalPoints] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedPointsRef = useRef<number>(-1);

  // Initialize identity from localStorage and server
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = getOrCreatePlayerId();
    setPlayerId(id);

    const savedNick = localStorage.getItem("aurafarmers_nickname");
    if (savedNick) setNickname(savedNick);

    const savedKey = localStorage.getItem("aurafarmers_recovery_key");
    if (savedKey) setRecoveryKey(savedKey);

    // Initial fetch to sync server state if already exists
    fetch(`/api/player?playerId=${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.player) {
          setNickname(data.player.nickname);
          setRecoveryKey(data.player.recoveryKey);
          setServerTotalPoints(data.player.totalPoints);
          localStorage.setItem("aurafarmers_nickname", data.player.nickname);
          localStorage.setItem("aurafarmers_recovery_key", data.player.recoveryKey);
          localStorage.setItem("aurafarmers_points", data.player.totalPoints.toString());
        }
      })
      .catch(() => {});
  }, []);

  // Sync points (replaces or sets total)
  const syncPoints = useCallback(
    (points: number, combo = 0, force = false) => {
      if (!playerId || (points === lastSyncedPointsRef.current && !force)) return;

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      const performSync = async () => {
        try {
          setIsSyncing(true);
          const res = await fetch("/api/player", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playerId,
              nickname,
              points,
              combo,
            }),
          });

          if (!res.ok) throw new Error("Fallo al guardar en el servidor");

          const data = await res.json();
          if (data.player) {
            lastSyncedPointsRef.current = points;
            if (data.player.recoveryKey && data.player.recoveryKey !== recoveryKey) {
              setRecoveryKey(data.player.recoveryKey);
              localStorage.setItem("aurafarmers_recovery_key", data.player.recoveryKey);
            }
          }
          setLastSyncError(null);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Error desconocido";
          setLastSyncError(msg);
        } finally {
          setIsSyncing(false);
        }
      };

      if (force) {
        performSync();
      } else {
        syncTimeoutRef.current = setTimeout(performSync, 1500);
      }
    },
    [playerId, nickname, recoveryKey]
  );

  // Add round points (ACCUMULATES points to existing score)
  const addRoundScore = useCallback(
    async (pointsEarned: number, combo = 0): Promise<Player | null> => {
      if (!playerId || pointsEarned <= 0) return null;
      try {
        setIsSyncing(true);
        const res = await fetch("/api/player", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId,
            nickname,
            pointsToAdd: pointsEarned,
            combo,
          }),
        });

        if (!res.ok) throw new Error("Fallo al guardar en el servidor");

        const data = await res.json();
        if (data.player) {
          const updatedPlayer: Player = data.player;
          if (updatedPlayer.recoveryKey) {
            setRecoveryKey(updatedPlayer.recoveryKey);
            localStorage.setItem("aurafarmers_recovery_key", updatedPlayer.recoveryKey);
          }
          localStorage.setItem("aurafarmers_points", updatedPlayer.totalPoints.toString());
          setServerTotalPoints(updatedPlayer.totalPoints);
          return updatedPlayer;
        }
        return null;
      } catch (err: unknown) {
        console.error("Error adding round score:", err);
        return null;
      } finally {
        setIsSyncing(false);
      }
    },
    [playerId, nickname]
  );

  const updateNickname = useCallback(
    async (newName: string, currentPoints = 0): Promise<boolean> => {
      const clean = newName.trim().slice(0, 20);
      if (!clean || !playerId) return false;

      setNickname(clean);
      localStorage.setItem("aurafarmers_nickname", clean);

      try {
        const res = await fetch("/api/player", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId,
            nickname: clean,
            points: currentPoints,
          }),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [playerId]
  );

  const recoverProfile = useCallback(
    async (key: string): Promise<Player | null> => {
      try {
        const res = await fetch("/api/player/recover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recoveryKey: key }),
        });

        if (!res.ok) return null;

        const data = await res.json();
        if (data.player) {
          const p: Player = data.player;
          setPlayerId(p.id);
          setNickname(p.nickname);
          setRecoveryKey(p.recoveryKey);
          setServerTotalPoints(p.totalPoints);

          localStorage.setItem("aurafarmers_player_id", p.id);
          localStorage.setItem("aurafarmers_nickname", p.nickname);
          localStorage.setItem("aurafarmers_recovery_key", p.recoveryKey);
          localStorage.setItem("aurafarmers_points", p.totalPoints.toString());

          return p;
        }
        return null;
      } catch {
        return null;
      }
    },
    []
  );

  return {
    playerId,
    nickname,
    recoveryKey,
    serverTotalPoints,
    isSyncing,
    lastSyncError,
    syncPoints,
    addRoundScore,
    updateNickname,
    recoverProfile,
  };
}
