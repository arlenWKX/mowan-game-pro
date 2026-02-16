// ============================================
// Room Detail API - 房间详情
// ============================================

import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { successResponse, errorResponse, NotFoundError } from "@/lib/api"
import { withErrorHandler } from "@/lib/api"

export const GET = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: unknown }
) => {
  const { id } = params as { id: string }
  const room = db.getRoom(id)
  if (!room) {
    throw new NotFoundError('房间不存在')
  }

  const players = db.getRoomPlayers(id)

  return successResponse({
    room: {
      id: room.id,
      creatorId: room.creatorId,
      maxPlayers: room.maxPlayers,
      status: room.status,
      currentRound: room.currentRound,
      currentTurn: room.currentTurn,
      createdAt: room.createdAt
    },
    players
  })
})
