// ============================================
// Core Types - 魔丸小游戏类型定义
// ============================================

/** 用户 */
export interface User {
  id: string
  username: string
  nickname: string
  isAdmin: boolean
  wins: number
  losses: number
  totalGames: number
  createdAt: string
}

/** 带密码的用户（仅后端使用） */
export interface UserWithPassword extends User {
  password: string
}

/** 玩家 */
export interface Player {
  userId: string
  username: string
  nickname: string
  order: number
  board: Board
  eliminated: number[]
  isReady: boolean
  isActive: boolean
  isBot?: boolean
  /** 本回合是否已行动 */
  hasActed?: boolean
}

/** 棋盘 3x6 网格 */
export type Board = Record<string, number | null>

/** 房间状态 */
export type RoomStatus = 'waiting' | 'playing' | 'finished'

/** 游戏行动类型 */
export type GameAction =
  | { type: 'move'; from: string; to: string | 'public' }
  | { type: 'recycle'; pieceIndex: number }
  | { type: 'duel'; targetPlayerId: string }

/** 待执行行动 */
export interface PendingAction {
  playerId: string
  action: GameAction
  order: number
}

/** 房间 */
export interface Room {
  id: string
  creatorId: string
  maxPlayers: number
  status: RoomStatus
  currentRound: number
  currentTurn: number
  turnOrder: string[]
  publicArea: { number: number; playerId: string; nickname: string; cellId?: string }[]
  players: Player[]
  createdAt: string
  updatedAt: string
  winner?: string
  /** 已行动的玩家ID列表（当前回合） */
  actedPlayers: string[]
  /** 是否需要结算 */
  needsSettlement: boolean
  /** 待执行行动列表（事件驱动架构） */
  pendingActions?: PendingAction[]
  /** 当前活跃的分叉ID（事件驱动架构） */
  activeSplitId?: string
  /** 游戏阶段（事件驱动架构） */
  phase?: 'deploy' | 'action' | 'settlement' | 'extra_turn' | 'ended'
}

/** 游戏状态响应 */
export interface GameStateResponse {
  roomStatus: RoomStatus
  currentRound: number
  currentTurn: number
  turnOrder: string[]
  publicArea: { number: number; playerId: string; nickname: string; cellId?: string }[]
  playerBoards: Record<string, {
    board: Record<string, number | null | string>
    eliminated: number[]
    nickname: string
    isBot?: boolean
  }>
  yourTurn: boolean
  /** 当前玩家本回合是否已行动 */
  hasActed: boolean
  /** 本回合已行动的玩家列表 */
  actedPlayers: string[]
  /** 是否需要结算 */
  needsSettlement: boolean
  currentPlayerId: string
  currentPlayerNickname: string
  /** 游戏阶段（事件驱动架构） */
  phase?: 'deploy' | 'action' | 'settlement' | 'extra_turn' | 'ended'
  /** 当前活跃的分叉信息 */
  activeSplit?: {
    splitId: string
    totalBranches: number
    completedBranches: number
    pendingPlayers: string[]
  }
}

/** 排行榜条目 */
export interface LeaderboardEntry {
  rank: number
  nickname: string
  wins: number
  losses: number
  totalGames: number
  winRate: number
}

/** JWT Payload */
export interface JWTPayload {
  userId: string
  username: string
  isAdmin: boolean
  iat: number
  exp: number
}

/** API 响应 */
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string
  code?: string
}

// ============================================
// Constants
// ============================================

export const BOARD_COLS = ['A', 'B', 'C', 'D', 'E', 'F'] as const
export const BOARD_ROWS = [1, 2, 3] as const
export type CellId = `${typeof BOARD_ROWS[number]}${typeof BOARD_COLS[number]}`
export const MAX_PLAYERS = 5
export const MIN_PLAYERS = 2
export const TOTAL_NUMBERS = 10
