import { NextResponse } from "next/server";
import { rebirthPlayer } from "@/lib/leaderboard/storage";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { playerId, nickname } = body;

    if (!playerId || typeof playerId !== "string") {
      return NextResponse.json(
        { success: false, error: "missing_player_id" },
        { status: 400 }
      );
    }

    if (!nickname || typeof nickname !== "string") {
      return NextResponse.json(
        { success: false, error: "missing_nickname" },
        { status: 400 }
      );
    }

    const result = await rebirthPlayer(playerId, nickname);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "server_error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
