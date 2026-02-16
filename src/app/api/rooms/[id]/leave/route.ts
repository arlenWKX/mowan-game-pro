// ============================================
// Leave Room API - 离开房间
// ============================================

import { db } from "@/lib/db"
import { withAuth, successResponse, NotFoundError } from "@/lib/api"

export const POST = withAuth(async (req, { params, auth }) => {
  const { id } = params as { id: string }
  const room = db.getRoom(id)
  if (!room) {
    throw new NotFoundError('房间不存在')
  }

  db.leaveRoom(id, auth.userId)
  return successResponse(null, '已离开房间')
})
