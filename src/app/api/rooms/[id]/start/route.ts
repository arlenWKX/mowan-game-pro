// ============================================
// Start Game API - 开始游戏
// ============================================

import { db } from "@/lib/db"
import { withAuth, successResponse, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"

export const POST = withAuth(async (req, { params, auth }) => {
  const { id } = params as { id: string }
  const room = db.getRoom(id)
  if (!room) {
    throw new NotFoundError('房间不存在')
  }

  // Only creator can start
  if (room.creatorId !== auth.userId) {
    throw new ForbiddenError('只有房主可以开始游戏')
  }

  if (room.status !== 'waiting') {
    throw new BadRequestError('游戏已经开始')
  }

  const result = db.startGame(id)
  
  if (!result.success) {
    throw new BadRequestError(result.error || '开始游戏失败')
  }

  return successResponse({
    turnOrder: result.turnOrder
  }, '游戏开始')
})
