// ============================================
// Action API - 玩家行动
// 
// 使用统一的 executeAction 服务函数，确保与人工玩家和人机使用相同的业务逻辑
// ============================================

import { db } from "@/lib/db"
import { withAuth, successResponse, NotFoundError, BadRequestError } from "@/lib/api"
import { executeAction } from "@/lib/bot-service"
import type { GameAction } from "@/types"

export const POST = withAuth(async (req, { params, auth }) => {
  const { id } = params as { id: string }
  const room = db.getRoom(id)
  if (!room) {
    throw new NotFoundError('房间不存在')
  }

  if (room.status !== 'playing') {
    throw new BadRequestError('游戏未开始或已结束')
  }

  // Check if player is in the room and active
  const players = db.getRoomPlayers(id)
  const player = players.find(p => p.userId === auth.userId)
  if (!player) {
    throw new BadRequestError('您不在该房间中')
  }
  if (!player.isActive) {
    throw new BadRequestError('您已被淘汰')
  }

  const { action } = await req.json() as { action: GameAction }

  if (!action || !action.type) {
    throw new BadRequestError('无效的行动')
  }

  // 使用统一的服务函数执行行动（与人机使用相同的逻辑）
  const result = await executeAction(id, auth.userId, action)

  if (!result.success) {
    throw new BadRequestError(result.error || '行动失败')
  }

  return successResponse(null, '行动已记录')
})
