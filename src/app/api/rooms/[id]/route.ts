import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const room = db.getRoom(params.id)
    if (!room) {
      return NextResponse.json(
        { error: "房间不存在" },
        { status: 404 }
      )
    }

    const players = db.getRoomPlayers(params.id)

    return NextResponse.json({
      room: {
        id: room.id,
        creatorId: room.creatorId,
        maxPlayers: room.maxPlayers,
        status: room.status,
        currentRound: room.currentRound,
        currentTurn: room.currentTurn
      },
      players
    })
  } catch (error) {
    return NextResponse.json(
      { error: "获取房间信息失败" },
      { status: 500 }
    )
  }
}