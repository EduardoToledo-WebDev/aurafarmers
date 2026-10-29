import { NextRequest, NextResponse } from "next/server";
import { getPlayerByRecoveryKey } from "@/lib/leaderboard/storage";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recoveryKey } = body;

    if (!recoveryKey || typeof recoveryKey !== "string") {
      return NextResponse.json({ error: "Llave de recuperación requerida" }, { status: 400 });
    }

    const player = await getPlayerByRecoveryKey(recoveryKey);
    if (!player) {
      return NextResponse.json(
        { error: "No se encontró ningún jugador con esa llave de recuperación" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      player,
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("Error in POST /api/player/recover:", err);
    return NextResponse.json({ error: "Error al recuperar perfil" }, { status: 500 });
  }
}
