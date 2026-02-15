import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function GET(
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

    const players = db.getRoomPlayers(params.id)
    const playerBoards: Record<string, { board: Record<string, number | null | string>; eliminated: number[]; nickname: string }> = {}

    for (const player of players) {
      const board = player.board || {}
      
      if (player.userId === payload.userId) {
        // Show own board fully
        playerBoards[player.userId] = {
          board,
          eliminated: player.eliminated || [],
          nickname: player.nickname
        }
      } else {
        // Show only occupied status
        const summary: Record<string, string | null> = {}
        for (const [cellId, num] of Object.entries(board)) {
          summary[cellId] = num !== null ? "occupied" : null
        }
        playerBoards[player.userId] = {
          board: summary,
          eliminated: player.eliminated || [],
          nickname: player.nickname
        }
      }
    }

    const isMyTurn = room.turnOrder[room.currentTurn] === payload.userId && room.status === "playing"

    return NextResponse.json({
      roomStatus: room.status,
      currentRound: room.currentRound,
      currentTurn: room.currentTurn,
      turnOrder: room.turnOrder,
      publicArea: room.publicArea,
      playerBoards,
      yourTurn: isMyTurn
    })
  } catch (error) {
    return NextResponse.json(
      { error: "获取游戏状态失败" },
      { status: 500 }
    )
  }
}