// ============================================
// Game State API - 游戏状态
// ============================================

import { db } from "@/lib/db"
import { withAuth, successResponse, NotFoundError } from "@/lib/api"
import { getEventBus } from "@/lib/event-bus"

export const GET = withAuth(async (req, { params, auth }) => {
  const { id } = params as { id: string }
  const room = db.getRoom(id)
  if (!room) {
    throw new NotFoundError('房间不存在')
  }

  const players = db.getRoomPlayers(id)
  const currentPlayerId = room.turnOrder[room.currentTurn]
  const currentPlayer = players.find(p => p.userId === currentPlayerId)

  // Build player boards
  const playerBoards: Record<string, {
    board: Record<string, number | null | string>
    eliminated: number[]
    nickname: string
    isBot?: boolean
  }> = {}

  for (const player of players) {
    const board = player.board || {}
    
    if (player.userId === auth.userId) {
      // Show own board fully
      playerBoards[player.userId] = {
        board,
        eliminated: player.eliminated || [],
        nickname: player.nickname,
        isBot: player.isBot
      }
    } else {
      // Show only occupied status for others
      const summary: Record<string, string | null> = {}
      for (const [cellId, num] of Object.entries(board)) {
        summary[cellId] = num !== null ? 'occupied' : null
      }
      playerBoards[player.userId] = {
        board: summary,
        eliminated: player.eliminated || [],
        nickname: player.nickname,
        isBot: player.isBot
      }
    }
  }

  const isMyTurn = currentPlayerId === auth.userId && room.status === 'playing'
  const hasActed = room.actedPlayers?.includes(auth.userId) ?? false

  // Get active split info from event bus
  let activeSplitInfo = undefined
  try {
    const eventBus = getEventBus()
    const activeSplit = await eventBus.getActiveSplit(id)
    if (activeSplit) {
      const pendingPlayers: string[] = []
      const branchesArray = Array.from(activeSplit.branches.entries())
      for (const [, branch] of branchesArray) {
        if (branch.status === 'pending' && branch.playerId) {
          pendingPlayers.push(branch.playerId)
        }
      }
      activeSplitInfo = {
        splitId: activeSplit.splitId,
        totalBranches: activeSplit.branches.size,
        completedBranches: Array.from(activeSplit.branches.values()).filter(b => b.status === 'completed').length,
        pendingPlayers
      }
    }
  } catch (error) {
    // Event bus might not be initialized yet
    console.error('Failed to get active split:', error)
  }

  return successResponse({
    roomStatus: room.status,
    currentRound: room.currentRound,
    currentTurn: room.currentTurn,
    turnOrder: room.turnOrder,
    publicArea: room.publicArea,
    playerBoards,
    yourTurn: isMyTurn,
    hasActed,
    actedPlayers: room.actedPlayers || [],
    needsSettlement: room.needsSettlement || false,
    currentPlayerId,
    currentPlayerNickname: currentPlayer?.nickname || '',
    phase: room.phase,
    activeSplit: activeSplitInfo
  })
})
