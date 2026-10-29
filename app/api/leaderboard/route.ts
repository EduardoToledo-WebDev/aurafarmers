import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/leaderboard/storage";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const week = searchParams.get("week") || undefined;
    const playerId = searchParams.get("playerId") || undefined;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    const leaderboard = await getLeaderboard(week, limit, playerId);
    return NextResponse.json(leaderboard);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("Error in GET /api/leaderboard:", err);
    return NextResponse.json(
      { error: "Error al obtener la tabla de clasificación" },
      { status: 500 }
    );
  }
}
