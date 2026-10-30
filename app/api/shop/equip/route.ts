import { NextRequest, NextResponse } from "next/server";
import { equipShopItem } from "@/lib/leaderboard/storage";
import { ShopCategory } from "@/lib/shop/catalog";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, slot, itemId } = body;

    if (!playerId || typeof playerId !== "string") {
      return NextResponse.json({ error: "playerId required" }, { status: 400 });
    }
    if (!slot || !["gloves", "head", "aura"].includes(slot)) {
      return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
    }
    if (!itemId || typeof itemId !== "string") {
      return NextResponse.json({ error: "itemId required" }, { status: 400 });
    }

    const result = await equipShopItem({
      playerId,
      slot: slot as ShopCategory,
      itemId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      player: result.player,
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("Error in POST /api/shop/equip:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
