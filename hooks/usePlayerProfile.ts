"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Player, PlayerEquipped } from "@/lib/leaderboard/types";
import {
  DEFAULT_EQUIPPED,
  DEFAULT_UNLOCKED_ITEMS,
  ShopCategory,
} from "@/lib/shop/catalog";

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
  const [coins, setCoins] = useState<number>(0);
  const [unlockedItemIds, setUnlockedItemIds] = useState<string[]>(DEFAULT_UNLOCKED_ITEMS);
  const [equipped, setEquipped] = useState<PlayerEquipped>(DEFAULT_EQUIPPED);
  const [lastCoinsEarned, setLastCoinsEarned] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedPointsRef = useRef<number>(-1);

  // Helper to commit player fields to state & local cache
  const applyPlayerState = useCallback((p: Player) => {
    setNickname(p.nickname);
    setRecoveryKey(p.recoveryKey);
    setServerTotalPoints(p.totalPoints);
    setCoins(typeof p.coins === "number" ? p.coins : 0);
    const unlocked = Array.isArray(p.unlockedItemIds) && p.unlockedItemIds.length > 0
      ? p.unlockedItemIds
      : DEFAULT_UNLOCKED_ITEMS;
    setUnlockedItemIds(unlocked);
    const eq = p.equipped ? { ...DEFAULT_EQUIPPED, ...p.equipped } : DEFAULT_EQUIPPED;
    setEquipped(eq);

    localStorage.setItem("aurafarmers_nickname", p.nickname);
    localStorage.setItem("aurafarmers_recovery_key", p.recoveryKey);
    localStorage.setItem("aurafarmers_points", p.totalPoints.toString());
    localStorage.setItem("aurafarmers_coins", (p.coins ?? 0).toString());
    localStorage.setItem("aurafarmers_unlocked_items", JSON.stringify(unlocked));
    localStorage.setItem("aurafarmers_equipped", JSON.stringify(eq));
  }, []);

  // Initialize identity from localStorage and server
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = getOrCreatePlayerId();
    setPlayerId(id);

    const savedNick = localStorage.getItem("aurafarmers_nickname");
    if (savedNick) setNickname(savedNick);

    const savedKey = localStorage.getItem("aurafarmers_recovery_key");
    if (savedKey) setRecoveryKey(savedKey);

    const savedCoins = localStorage.getItem("aurafarmers_coins");
    if (savedCoins) setCoins(Number(savedCoins) || 0);

    try {
      const savedUnlocked = localStorage.getItem("aurafarmers_unlocked_items");
      if (savedUnlocked) setUnlockedItemIds(JSON.parse(savedUnlocked));
      const savedEq = localStorage.getItem("aurafarmers_equipped");
      if (savedEq) setEquipped(JSON.parse(savedEq));
    } catch {
      // Fallback
    }

    // Initial fetch to sync server state if already exists
    fetch(`/api/player?playerId=${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.player) {
          applyPlayerState(data.player);
        }
      })
      .catch(() => {});
  }, [applyPlayerState]);

  // Sync points
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
            applyPlayerState(data.player);
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
    [playerId, nickname, applyPlayerState]
  );

  // Add round points (ACCUMULATES points and earns coins)
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
          applyPlayerState(updatedPlayer);
          if (typeof data.coinsEarned === "number") {
            setLastCoinsEarned(data.coinsEarned);
          } else {
            setLastCoinsEarned(Math.floor(pointsEarned / 10));
          }
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
    [playerId, nickname, applyPlayerState]
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
          localStorage.setItem("aurafarmers_player_id", p.id);
          applyPlayerState(p);
          return p;
        }
        return null;
      } catch {
        return null;
      }
    },
    [applyPlayerState]
  );

  const buyItem = useCallback(
    async (itemId: string): Promise<{ success: boolean; error?: string }> => {
      if (!playerId) return { success: false, error: "no_player" };

      try {
        setIsSyncing(true);
        const res = await fetch("/api/shop/buy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, itemId }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || "buy_failed" };
        }

        if (data.player) {
          applyPlayerState(data.player);
        }
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "buy_failed";
        return { success: false, error: msg };
      } finally {
        setIsSyncing(false);
      }
    },
    [playerId, applyPlayerState]
  );

  const equipItem = useCallback(
    async (
      slot: ShopCategory,
      itemId: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!playerId) return { success: false, error: "no_player" };

      // Optimistic update
      setEquipped((prev) => {
        const updated = { ...prev, [slot]: itemId };
        localStorage.setItem("aurafarmers_equipped", JSON.stringify(updated));
        return updated;
      });

      try {
        const res = await fetch("/api/shop/equip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, slot, itemId }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || "equip_failed" };
        }

        if (data.player) {
          applyPlayerState(data.player);
        }
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "equip_failed";
        return { success: false, error: msg };
      }
    },
    [playerId, applyPlayerState]
  );

  return {
    playerId,
    nickname,
    recoveryKey,
    serverTotalPoints,
    coins,
    unlockedItemIds,
    equipped,
    lastCoinsEarned,
    isSyncing,
    lastSyncError,
    syncPoints,
    addRoundScore,
    updateNickname,
    recoverProfile,
    buyItem,
    equipItem,
  };
}
