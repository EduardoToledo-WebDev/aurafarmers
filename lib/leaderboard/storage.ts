import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  LeaderboardData,
  LeaderboardEntry,
  LeaderboardResponse,
  Player,
  PlayerEquipped,
  WeeklyScoreRecord,
} from "./types";
import { getRank } from "@/lib/ranks";
import {
  DEFAULT_EQUIPPED,
  DEFAULT_UNLOCKED_ITEMS,
  getShopItem,
  ShopCategory,
} from "@/lib/shop/catalog";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "leaderboard.json");

// Mutex queue to serialize file writes and prevent concurrent file corruption
let writeQueue = Promise.resolve();

function enqueueWrite<T>(action: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(action);
  writeQueue = result.then(() => {}).catch(() => {});
  return result;
}

export function getCurrentWeekKey(d = new Date()): string {
  // ISO-8601 week calculation
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function getNextResetDate(d = new Date()): Date {
  const date = new Date(d);
  const day = date.getUTCDay();
  // Monday is 1. Days until next Monday:
  const daysUntilNextMonday = ((8 - day) % 7) || 7;
  const nextMonday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + daysUntilNextMonday, 0, 0, 0, 0)
  );
  return nextMonday;
}

export function generateRecoveryKey(): string {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `AURA-${rand}`;
}

async function loadData(): Promise<LeaderboardData> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      players: parsed.players || {},
      weeklyScores: parsed.weeklyScores || {},
    };
  } catch {
    return {
      players: {},
      weeklyScores: {},
    };
  }
}

async function saveData(data: LeaderboardData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${DATA_FILE}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tempFile, DATA_FILE);
}

export function normalizePlayer(p: Player): Player {
  return {
    ...p,
    coins: typeof p.coins === "number" ? p.coins : 0,
    unlockedItemIds: Array.isArray(p.unlockedItemIds) && p.unlockedItemIds.length > 0
      ? p.unlockedItemIds
      : [...DEFAULT_UNLOCKED_ITEMS],
    equipped: p.equipped
      ? { ...DEFAULT_EQUIPPED, ...p.equipped }
      : { ...DEFAULT_EQUIPPED },
  };
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  const data = await loadData();
  const player = data.players[playerId];
  return player ? normalizePlayer(player) : null;
}

export async function getPlayerByRecoveryKey(recoveryKey: string): Promise<Player | null> {
  const data = await loadData();
  const normalizedKey = recoveryKey.trim().toUpperCase();
  const player = Object.values(data.players).find(
    (p) => p.recoveryKey.toUpperCase() === normalizedKey
  );
  return player ? normalizePlayer(player) : null;
}

export async function addPlayerRoundScore(params: {
  playerId: string;
  nickname?: string;
  pointsToAdd: number;
  combo?: number;
}): Promise<{ player: Player; weeklyScore: WeeklyScoreRecord; week: string; coinsEarned: number }> {
  return enqueueWrite(async () => {
    const data = await loadData();
    const now = new Date().toISOString();
    const week = getCurrentWeekKey();

    let player = data.players[params.playerId];
    const cleanNick = (params.nickname?.trim() || player?.nickname || `AuraFarmer_${params.playerId.slice(0, 4)}`).slice(0, 20);
    const safeAdd = Math.max(0, params.pointsToAdd);
    // 10:1 ratio - 10,000 points = 1,000 coins
    const coinsEarned = Math.floor(safeAdd / 10);

    if (!player) {
      player = {
        id: params.playerId,
        nickname: cleanNick,
        recoveryKey: generateRecoveryKey(),
        totalPoints: safeAdd,
        highestCombo: params.combo || 0,
        coins: coinsEarned,
        unlockedItemIds: [...DEFAULT_UNLOCKED_ITEMS],
        equipped: { ...DEFAULT_EQUIPPED },
        createdAt: now,
        updatedAt: now,
      };
    } else {
      player = normalizePlayer(player);
      player.nickname = cleanNick;
      player.totalPoints = (player.totalPoints || 0) + safeAdd;
      player.highestCombo = Math.max(player.highestCombo || 0, params.combo || 0);
      player.coins = (player.coins || 0) + coinsEarned;
      player.updatedAt = now;
    }
    data.players[params.playerId] = player;

    if (!data.weeklyScores[week]) {
      data.weeklyScores[week] = {};
    }

    const currentWeekly = data.weeklyScores[week][params.playerId] || {
      points: 0,
      highestCombo: 0,
      updatedAt: now,
    };

    const updatedWeekly: WeeklyScoreRecord = {
      points: (currentWeekly.points || 0) + safeAdd,
      highestCombo: Math.max(currentWeekly.highestCombo || 0, params.combo || 0),
      updatedAt: now,
    };
    data.weeklyScores[week][params.playerId] = updatedWeekly;

    await saveData(data);

    return { player, weeklyScore: updatedWeekly, week, coinsEarned };
  });
}

export async function syncPlayerScore(params: {
  playerId: string;
  nickname?: string;
  points: number;
  combo?: number;
}): Promise<{ player: Player; weeklyScore: WeeklyScoreRecord; week: string }> {
  return enqueueWrite(async () => {
    const data = await loadData();
    const now = new Date().toISOString();
    const week = getCurrentWeekKey();

    let player = data.players[params.playerId];
    const cleanNick = (params.nickname?.trim() || player?.nickname || `AuraFarmer_${params.playerId.slice(0, 4)}`).slice(0, 20);

    if (!player) {
      player = {
        id: params.playerId,
        nickname: cleanNick,
        recoveryKey: generateRecoveryKey(),
        totalPoints: Math.max(0, params.points),
        highestCombo: params.combo || 0,
        coins: 0,
        unlockedItemIds: [...DEFAULT_UNLOCKED_ITEMS],
        equipped: { ...DEFAULT_EQUIPPED },
        createdAt: now,
        updatedAt: now,
      };
    } else {
      player = normalizePlayer(player);
      player.nickname = cleanNick;
      player.totalPoints = Math.max(player.totalPoints, params.points);
      player.highestCombo = Math.max(player.highestCombo, params.combo || 0);
      player.updatedAt = now;
    }
    data.players[params.playerId] = player;

    if (!data.weeklyScores[week]) {
      data.weeklyScores[week] = {};
    }

    const currentWeekly = data.weeklyScores[week][params.playerId] || {
      points: 0,
      highestCombo: 0,
      updatedAt: now,
    };

    const updatedWeekly: WeeklyScoreRecord = {
      points: Math.max(currentWeekly.points, params.points),
      highestCombo: Math.max(currentWeekly.highestCombo, params.combo || 0),
      updatedAt: now,
    };
    data.weeklyScores[week][params.playerId] = updatedWeekly;

    await saveData(data);

    return { player, weeklyScore: updatedWeekly, week };
  });
}

export async function buyShopItem(params: {
  playerId: string;
  itemId: string;
}): Promise<{ success: boolean; player?: Player; error?: string }> {
  return enqueueWrite(async () => {
    const data = await loadData();
    let player = data.players[params.playerId];
    if (!player) {
      return { success: false, error: "player_not_found" };
    }
    player = normalizePlayer(player);

    const item = getShopItem(params.itemId);
    if (!item) {
      return { success: false, error: "item_not_found" };
    }

    if (player.unlockedItemIds.includes(params.itemId)) {
      return { success: false, error: "already_owned" };
    }

    if (player.coins < item.price) {
      return { success: false, error: "insufficient_coins" };
    }

    player.coins -= item.price;
    player.unlockedItemIds.push(params.itemId);
    player.equipped[item.category] = params.itemId;
    player.updatedAt = new Date().toISOString();

    data.players[params.playerId] = player;
    await saveData(data);

    return { success: true, player };
  });
}

export async function equipShopItem(params: {
  playerId: string;
  slot: ShopCategory;
  itemId: string;
}): Promise<{ success: boolean; player?: Player; error?: string }> {
  return enqueueWrite(async () => {
    const data = await loadData();
    let player = data.players[params.playerId];
    if (!player) {
      return { success: false, error: "player_not_found" };
    }
    player = normalizePlayer(player);

    if (params.itemId !== "head_none" && !player.unlockedItemIds.includes(params.itemId)) {
      return { success: false, error: "item_not_owned" };
    }

    player.equipped[params.slot] = params.itemId;
    player.updatedAt = new Date().toISOString();

    data.players[params.playerId] = player;
    await saveData(data);

    return { success: true, player };
  });
}

export async function rebirthPlayer(
  playerId: string,
  nicknameConfirmation: string
): Promise<{ success: boolean; player?: Player; error?: string }> {
  return enqueueWrite(async () => {
    const data = await loadData();
    let player = data.players[playerId];
    if (!player) {
      return { success: false, error: "player_not_found" };
    }

    if (player.nickname.trim().toLowerCase() !== nicknameConfirmation.trim().toLowerCase()) {
      return { success: false, error: "nickname_mismatch" };
    }

    player = normalizePlayer(player);
    const now = new Date().toISOString();
    player.totalPoints = 0;
    player.highestCombo = 0;
    player.rebirthCount = (player.rebirthCount || 0) + 1;
    player.updatedAt = now;

    // Reset points in current week
    const week = getCurrentWeekKey();
    if (data.weeklyScores[week] && data.weeklyScores[week][playerId]) {
      data.weeklyScores[week][playerId] = {
        points: 0,
        highestCombo: 0,
        updatedAt: now,
      };
    }

    data.players[playerId] = player;
    await saveData(data);

    return { success: true, player };
  });
}

export async function getLeaderboard(
  weekKey?: string,
  limit = 50,
  currentUserId?: string
): Promise<LeaderboardResponse> {
  const data = await loadData();
  const week = weekKey || getCurrentWeekKey();
  const weeklyMap = data.weeklyScores[week] || {};

  const entries: LeaderboardEntry[] = [];

  for (const [playerId, score] of Object.entries(weeklyMap)) {
    const player = data.players[playerId];
    if (!player) continue;

    const rankInfo = getRank(score.points);
    entries.push({
      rank: 0,
      playerId,
      nickname: player.nickname,
      points: score.points,
      highestCombo: score.highestCombo,
      rankTitle: rankInfo.name,
      rankEmoji: rankInfo.emoji,
    });
  }

  // Sort descending by points, then by highestCombo
  entries.sort((a, b) => b.points - a.points || b.highestCombo - a.highestCombo);

  // Assign 1-indexed ranks
  entries.forEach((item, index) => {
    item.rank = index + 1;
  });

  const topPlayers = entries.slice(0, limit);

  let currentUser: LeaderboardEntry | null = null;
  if (currentUserId) {
    const userFound = entries.find((e) => e.playerId === currentUserId);
    if (userFound) {
      currentUser = userFound;
    } else if (data.players[currentUserId]) {
      const p = data.players[currentUserId];
      const r = getRank(0);
      currentUser = {
        rank: entries.length + 1,
        playerId: p.id,
        nickname: p.nickname,
        points: 0,
        highestCombo: 0,
        rankTitle: r.name,
        rankEmoji: r.emoji,
      };
    }
  }

  return {
    week,
    nextResetAt: getNextResetDate().toISOString(),
    topPlayers,
    totalPlayers: entries.length,
    currentUser,
  };
}
