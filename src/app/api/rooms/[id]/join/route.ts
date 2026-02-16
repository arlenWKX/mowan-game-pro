// ============================================
// Join Room API - 加入房间
// ============================================

import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { withAuth, successResponse, NotFoundError, ConflictError } from "@/lib/api"

export const POST = withAuth(async (req, { params, auth }) => {
  const { id } = params as { id: string }
  const room = db.getRoom(id)
  if (!room) {
    throw new NotFoundError('房间不存在')
  }

  const user = db.getUserById(auth.userId)
  if (!user) {
    throw new NotFoundError('用户不存在')
  }

  const result = db.joinRoom(id, auth.userId, {
    username: user.username,
    nickname: user.nickname
  })

  if (!result.success) {
    throw new ConflictError(result.error)
  }

  return successResponse(null, '加入房间成功')
})
