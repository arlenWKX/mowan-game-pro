import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "无效的令牌" }, { status: 401 })
    }

    const room = db.getRoom(params.id)
    if (!room) {
      return NextResponse.json({ error: "房间不存在" }, { status: 404 })
    }

    if (room.creatorId !== payload.userId) {
      return NextResponse.json({ error: "只有房主可以开始游戏" }, { status: 403 })
    }

    const players = db.getRoomPlayers(params.id)
    if (players.length < 2) {
      return NextResponse.json({ error: "至少需要2名玩家" }, { status: 400 })
    }

    // Random turn order
    const turnOrder = players.map(p => p.userId).sort(() => Math.random() - 0.5)

    // Assign player orders
    turnOrder.forEach((userId, idx) => {
      db.updatePlayerOrder(params.id, userId, idx)
    })

    // Update room status
    db.updateRoomStatus(params.id, "playing")
    db.updateRoomGameState(params.id, {
      turnOrder,
      currentRound: 1,
      currentTurn: 0,
      publicArea: []
    })

    return NextResponse.json({
      message: "游戏开始",
      turnOrder
    })
  } catch (error) {
    return NextResponse.json(
      { error: "开始游戏失败" },
      { status: 500 }
    )
  }
}