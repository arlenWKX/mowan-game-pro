// ============================================
// Ready/Deploy API - 部署完成
// 
// 使用统一的 executeDeploy 服务函数，确保与人工玩家和人机使用相同的业务逻辑
// ============================================

import { db } from "@/lib/db"
import { withAuth, successResponse, NotFoundError, BadRequestError } from "@/lib/api"
import { isValidBoard } from "@/lib/utils"
import { executeDeploy } from "@/lib/bot-service"
import type { Board } from "@/types"

export const POST = withAuth(async (req, { params, auth }) => {
  const { id } = params as { id: string }
  const room = db.getRoom(id)
  if (!room) {
    throw new NotFoundError('房间不存在')
  }

  // Check if player is in the room
  const players = db.getRoomPlayers(id)
  const player = players.find(p => p.userId === auth.userId)
  if (!player) {
    throw new BadRequestError('您不在该房间中，请重新加入房间')
  }

  const { board } = await req.json() as { board: Board }

  if (!isValidBoard(board)) {
    throw new BadRequestError('棋盘必须放置10个数字')
  }

  // 使用统一的服务函数执行部署（与人机使用相同的逻辑）
  const result = await executeDeploy(id, auth.userId, board)

  if (!result.success) {
    throw new BadRequestError(result.error || '部署失败，请重试')
  }

  return successResponse(null, '部署完成')
})
