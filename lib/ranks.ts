export interface AuraRank {
  name: string;
  nameEs?: string;
  minPoints: number;
  emoji: string;
  color: string;
  badgeBg: string;
  tagline: string;
  taglineEs?: string;
}

export const RANKS: AuraRank[] = [
  {
    name: "No Aura",
    nameEs: "Sin Aura",
    minPoints: 0,
    emoji: "💀",
    color: "text-zinc-400",
    badgeBg: "bg-zinc-800/80 border-zinc-700",
    tagline: "Start moving your hands before you lose more aura.",
    taglineEs: "Empieza a mover las manos antes de perder más aura."
  },
  {
    name: "Aura Novice",
    nameEs: "Novato del Aura",
    minPoints: 67,
    emoji: "🌱",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-950/60 border-emerald-500/40",
    tagline: "The 6 7 rhythm begins awakening within you.",
    taglineEs: "El ritmo del 6 7 empieza a despertar en ti."
  },
  {
    name: "Scale Hustler",
    nameEs: "Balanza Hustler",
    minPoints: 335,
    emoji: "⚖️",
    color: "text-cyan-400",
    badgeBg: "bg-cyan-950/60 border-cyan-500/40",
    tagline: "Weighing the aura with millimeter precision.",
    taglineEs: "Pesando el aura con precisión milimétrica."
  },
  {
    name: "Aura Farmer",
    nameEs: "Granjero de Aura",
    minPoints: 670,
    emoji: "🚜",
    color: "text-blue-400",
    badgeBg: "bg-blue-950/60 border-blue-500/40",
    tagline: "Harvesting +67 per second of pure energy.",
    taglineEs: "Cosechando +67 por segundo de pura energía."
  },
  {
    name: "Sigma Farmer",
    nameEs: "Granjero Sigma",
    minPoints: 2010,
    emoji: "🗿",
    color: "text-purple-400",
    badgeBg: "bg-purple-950/60 border-purple-500/40",
    tagline: "Your aura exceeds the limits of mere mortals.",
    taglineEs: "Tu aura supera los límites de los simples mortales."
  },
  {
    name: "Skrilla Disciple",
    nameEs: "Discípulo Skrilla",
    minPoints: 4489,
    emoji: "🔥",
    color: "text-amber-400",
    badgeBg: "bg-amber-950/60 border-amber-500/40",
    tagline: "Doot Doot 6 7 flowing constantly through your veins.",
    taglineEs: "Doot Doot 6 7 en tus venas sin descanso."
  },
  {
    name: "Aura God 67",
    nameEs: "Dios del Aura 67",
    minPoints: 6700,
    emoji: "👑",
    color: "text-rose-400",
    badgeBg: "bg-rose-950/60 border-rose-500/40",
    tagline: "Absolute legendary aura. Unreachable.",
    taglineEs: "Aura legendaria absoluta. Inalcanzable."
  },
  {
    name: "Transcended 67",
    nameEs: "67 Trascendido",
    minPoints: 13400,
    emoji: "🌌",
    color: "text-fuchsia-300",
    badgeBg: "bg-fuchsia-950/60 border-fuchsia-500/40",
    tagline: "You have broken the fabric of space and reality.",
    taglineEs: "Has roto el tejido del espacio y del brainrot."
  }
];

export function getRank(points: number): AuraRank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (points >= RANKS[i].minPoints) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

export function getNextRank(points: number): AuraRank | null {
  for (const rank of RANKS) {
    if (points < rank.minPoints) {
      return rank;
    }
  }
  return null;
}
