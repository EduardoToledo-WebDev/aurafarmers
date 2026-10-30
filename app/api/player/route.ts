import { NextRequest, NextResponse } from "next/server";
import { getPlayer, syncPlayerScore, addPlayerRoundScore } from "@/lib/leaderboard/storage";

export async function GET(request: NextRequest) {
  try {
    const playerId = request.nextUrl.searchParams.get("playerId");

    if (!playerId) {
      return NextResponse.json({ error: "playerId requerido" }, { status: 400 });
    }

    const player = await getPlayer(playerId);
    if (!player) {
      return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ player });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("Error in GET /api/player:", err);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, nickname, points, pointsToAdd, combo, mode } = body;

    if (!playerId || typeof playerId !== "string") {
      return NextResponse.json({ error: "playerId inválido" }, { status: 400 });
    }

    const safeCombo = Math.max(0, Number(combo) || 0);
    const shouldAdd = pointsToAdd !== undefined || mode === "add";

    let result;
    if (shouldAdd) {
      const delta = Math.max(0, Number(pointsToAdd ?? points) || 0);
      result = await addPlayerRoundScore({
        playerId,
        nickname: typeof nickname === "string" ? nickname : undefined,
        pointsToAdd: delta,
        combo: safeCombo,
      });
    } else {
      const safePoints = Math.max(0, Number(points) || 0);
      result = await syncPlayerScore({
        playerId,
        nickname: typeof nickname === "string" ? nickname : undefined,
        points: safePoints,
        combo: safeCombo,
      });
    }

    return NextResponse.json({
      success: true,
      player: result.player,
      weeklyScore: result.weeklyScore,
      week: result.week,
      coinsEarned: "coinsEarned" in result ? result.coinsEarned : 0,
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("Error in POST /api/player:", err);
    return NextResponse.json({ error: "Error al sincronizar datos" }, { status: 500 });
  }
}
