export interface User {
  id: string
  username: string
  nickname: string
  isAdmin: boolean
  wins: number
  losses: number
  totalGames: number
}

export interface Player {
  userId: string
  username: string
  nickname: string
  order: number
  board: Record<string, number | null>
  eliminated: number[]
  isReady: boolean
  isActive: boolean
}

export interface Room {
  id: string
  creatorId: string
  maxPlayers: number
  status: 'waiting' | 'playing' | 'finished'
  currentRound: number
  currentTurn: number
  turnOrder: string[]
  publicArea: { number: number; playerId: string }[]
  players: Player[]
  createdAt: string
}

export interface GameAction {
  type: 'forward' | 'challenge' | 'recycle' | 'pass'
  data?: Record<string, unknown>
}

export interface LeaderboardEntry {
  nickname: string
  wins: number
  losses: number
  totalGames: number
  winRate: number
}