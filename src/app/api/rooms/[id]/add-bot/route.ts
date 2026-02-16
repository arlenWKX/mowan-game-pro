// ============================================
// Add Bot API - 添加人机
// ============================================

import { db } from "@/lib/db"
import { withAuth, successResponse, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"

export const POST = withAuth(async (req, { params, auth }) => {
  const { id } = params as { id: string }
  const room = db.getRoom(id)
  if (!room) {
    throw new NotFoundError('房间不存在')
  }

  // Only creator can add bots
  if (room.creatorId !== auth.userId) {
    throw new ForbiddenError('只有房主可以添加人机')
  }

  if (room.status !== 'waiting') {
    throw new BadRequestError('游戏已开始，无法添加人机')
  }

  const players = db.getRoomPlayers(id)
  if (players.length >= room.maxPlayers) {
    throw new BadRequestError('房间已满')
  }

  const bot = db.createBotPlayer(id)
  if (!bot) {
    throw new BadRequestError('添加人机失败')
  }

  return successResponse({
    bot: {
      userId: bot.userId,
      nickname: bot.nickname,
      isBot: true
    }
  }, '人机添加成功')
})
