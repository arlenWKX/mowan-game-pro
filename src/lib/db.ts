// In-memory database for demo
// In production, replace with real database

import { User, Room, Player } from '@/types'
import { hashPassword } from './auth'

class Database {
  private users: Map<string, User & { password: string }> = new Map()
  private rooms: Map<string, Room> = new Map()
  private roomPlayers: Map<string, Map<string, Player>> = new Map()

  constructor() {
    // Create default admin
    this.createUser({
      username: 'admin',
      password: hashPassword('admin123'),
      nickname: '管理员',
      isAdmin: true
    })
  }

  // User methods
  createUser(data: { username: string; password: string; nickname: string; isAdmin?: boolean }): User | null {
    for (const user of this.users.values()) {
      if (user.username === data.username) return null
    }

    const id = crypto.randomUUID()
    const user = {
      id,
      username: data.username,
      password: data.password,
      nickname: data.nickname,
      isAdmin: data.isAdmin ?? false,
      wins: 0,
      losses: 0,
      totalGames: 0
    }
    this.users.set(id, user)
    return { ...user, password: undefined } as User
  }

  getUserById(id: string): User | null {
    const user = this.users.get(id)
    if (!user) return null
    return { ...user, password: undefined } as User
  }

  getUserByUsername(username: string): (User & { password: string }) | null {
    for (const user of this.users.values()) {
      if (user.username === username) return user
    }
    return null
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values()).map(u => ({ ...u, password: undefined }) as User)
  }

  updateUserBan(id: string, isBanned: boolean): boolean {
    const user = this.users.get(id)
    if (!user) return false
    // In real implementation, add isBanned field
    return true
  }

  deleteUser(id: string): boolean {
    const user = this.users.get(id)
    if (!user || user.isAdmin) return false
    this.users.delete(id)
    return true
  }

  updateUserStats(id: string, wins: number, losses: number): void {
    const user = this.users.get(id)
    if (user) {
      user.wins += wins
      user.losses += losses
      user.totalGames += wins + losses
    }
  }

  // Room methods
  createRoom(id: string, creatorId: string, maxPlayers: number): Room | null {
    if (this.rooms.has(id)) return null

    const room: Room = {
      id,
      creatorId,
      maxPlayers,
      status: 'waiting',
      currentRound: 0,
      currentTurn: 0,
      turnOrder: [],
      publicArea: [],
      players: [],
      createdAt: new Date().toISOString()
    }
    this.rooms.set(id, room)
    this.roomPlayers.set(id, new Map())
    return room
  }

  getRoom(id: string): Room | null {
    return this.rooms.get(id) || null
  }

  getRoomPlayers(roomId: string): Player[] {
    const players = this.roomPlayers.get(roomId)
    if (!players) return []
    return Array.from(players.values()).filter(p => p.isActive)
  }

  joinRoom(roomId: string, userId: string, userData: { username: string; nickname: string }): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    const players = this.roomPlayers.get(roomId)!
    if (players.has(userId)) return true

    const player: Player = {
      userId,
      username: userData.username,
      nickname: userData.nickname,
      order: -1,
      board: {},
      eliminated: [],
      isReady: false,
      isActive: true
    }
    players.set(userId, player)
    room.players = Array.from(players.values())
    return true
  }

  leaveRoom(roomId: string, userId: string): void {
    const players = this.roomPlayers.get(roomId)
    if (players) {
      const player = players.get(userId)
      if (player) {
        player.isActive = false
        const room = this.rooms.get(roomId)
        if (room) {
          room.players = Array.from(players.values())
        }
      }
    }
  }

  kickPlayer(roomId: string, userId: string): void {
    this.leaveRoom(roomId, userId)
  }

  updatePlayerBoard(roomId: string, userId: string, board: Record<string, number | null>, eliminated: number[]): void {
    const players = this.roomPlayers.get(roomId)
    if (players) {
      const player = players.get(userId)
      if (player) {
        player.board = board
        player.eliminated = eliminated
        player.isReady = true
      }
    }
  }

  updateRoomStatus(roomId: string, status: Room['status']): void {
    const room = this.rooms.get(roomId)
    if (room) room.status = status
  }

  updateRoomGameState(roomId: string, data: Partial<Room>): void {
    const room = this.rooms.get(roomId)
    if (room) {
      Object.assign(room, data)
    }
  }

  updatePlayerOrder(roomId: string, userId: string, order: number): void {
    const players = this.roomPlayers.get(roomId)
    if (players) {
      const player = players.get(userId)
      if (player) player.order = order
    }
  }

  getLeaderboard(limit: number = 20): Array<{ nickname: string; wins: number; losses: number; totalGames: number; winRate: number }> {
    const users = Array.from(this.users.values())
      .filter(u => u.totalGames > 0)
      .map(u => ({
        nickname: u.nickname,
        wins: u.wins,
        losses: u.losses,
        totalGames: u.totalGames,
        winRate: u.totalGames > 0 ? Math.round((u.wins / u.totalGames) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)
      .slice(0, limit)
    return users
  }
}

export const db = new Database()