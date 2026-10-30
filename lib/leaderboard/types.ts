export interface PlayerEquipped {
  gloves?: string;
  head?: string;
  aura?: string;
}

export interface Player {
  id: string;
  nickname: string;
  recoveryKey: string;
  totalPoints: number;
  highestCombo: number;
  coins: number;
  unlockedItemIds: string[];
  equipped: PlayerEquipped;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyScoreRecord {
  points: number;
  highestCombo: number;
  updatedAt: string;
}

export interface LeaderboardData {
  players: Record<string, Player>;
  weeklyScores: Record<string, Record<string, WeeklyScoreRecord>>;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  nickname: string;
  points: number;
  highestCombo: number;
  rankTitle: string;
  rankEmoji: string;
}

export interface LeaderboardResponse {
  week: string;
  nextResetAt: string;
  topPlayers: LeaderboardEntry[];
  totalPlayers: number;
  currentUser?: LeaderboardEntry | null;
}
