// ============================================
// Kick Player API - 踢出玩家
// ============================================

import { db } from "@/lib/db"
import { withAuth, successResponse, NotFoundError, ForbiddenError } from "@/lib/api"

export const POST = withAuth(async (req, { params, auth }) => {
  const { id, userId } = params as { id: string; userId: string }
  const room = db.getRoom(id)
  if (!room) {
    throw new NotFoundError('房间不存在')
  }

  // Only creator can kick
  if (room.creatorId !== auth.userId) {
    throw new ForbiddenError('只有房主可以踢人')
  }

  // Can't kick yourself
  if (userId === auth.userId) {
    throw new ForbiddenError('不能踢出自己')
  }

  db.kickPlayer(id, userId)
  return successResponse(null, '已踢出玩家')
})
