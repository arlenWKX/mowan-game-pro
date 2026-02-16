// ============================================
// Database Layer - 内存数据库实现
// ============================================

import { 
  type User, 
  type UserWithPassword, 
  type Room, 
  type Player,
  type Board,
  type RoomStatus,
  type PendingAction 
} from "@/types"
import { hashPassword } from "./auth"
import { createEmptyBoard, createRandomBoard, generateId } from "./utils"
import { EventType, getEventBus } from "./event-bus"

// ============================================
// Database Class
// ============================================

class Database {
  private users: Map<string, UserWithPassword> = new Map()
  private rooms: Map<string, Room> = new Map()
  private roomPlayers: Map<string, Map<string, Player>> = new Map()
  private botCounter = 0

  constructor() {
    this.initializeDefaultData()
  }

  // ============================================
  // Initialization
  // ============================================

  private initializeDefaultData(): void {
    // Create default admin user
    const adminId = crypto.randomUUID()
    const adminUser: UserWithPassword = {
      id: adminId,
      username: 'admin',
      password: hashPassword('admin123'),
      nickname: '管理员',
      isAdmin: true,
      wins: 0,
      losses: 0,
      totalGames: 0,
      createdAt: new Date().toISOString()
    }
    this.users.set(adminId, adminUser)
  }

  // ============================================
  // User Methods
  // ============================================

  createUser(data: { 
    username: string; 
    password: string; 
    nickname: string; 
    isAdmin?: boolean 
  }): User | null {
    // Check duplicate username
    const existingUser = this.findUserByUsername(data.username)
    if (existingUser) return null

    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const user: UserWithPassword = {
      id,
      username: data.username,
      password: data.password,
      nickname: data.nickname,
      isAdmin: data.isAdmin ?? false,
      wins: 0,
      losses: 0,
      totalGames: 0,
      createdAt: now
    }
    
    this.users.set(id, user)
    return this.sanitizeUser(user)
  }

  private findUserByUsername(username: string): UserWithPassword | undefined {
    for (const user of Array.from(this.users.values())) {
      if (user.username === username) return user
    }
    return undefined
  }

  getUserById(id: string): User | null {
    const user = this.users.get(id)
    return user ? this.sanitizeUser(user) : null
  }

  getUserByUsername(username: string): UserWithPassword | null {
    return this.findUserByUsername(username) ?? null
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values()).map(u => this.sanitizeUser(u))
  }

  updateUserStats(id: string, result: 'win' | 'loss'): boolean {
    const user = this.users.get(id)
    if (!user) return false

    if (result === 'win') {
      user.wins++
    } else {
      user.losses++
    }
    user.totalGames++
    return true
  }

  deleteUser(id: string): boolean {
    const user = this.users.get(id)
    if (!user || user.isAdmin) return false
    return this.users.delete(id)
  }

  private sanitizeUser(user: UserWithPassword): User {
    const { password, ...sanitized } = user
    return sanitized
  }

  // ============================================
  // Bot Methods
  // ============================================

  private generateBotName(): string {
    const botNames = ['小白', '小黑', '小红', '小蓝', '小绿', '小黄', '小紫', '小青', '小橙', '小灰']
    return botNames[Math.floor(Math.random() * botNames.length)]
  }

  createBotPlayer(roomId: string): Player | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const players = this.roomPlayers.get(roomId)
    if (!players) return null

    const activePlayers = Array.from(players.values()).filter(p => p.isActive)
    if (activePlayers.length >= room.maxPlayers) {
      return null
    }

    this.botCounter++
    const botId = `bot_${this.botCounter}_${Date.now()}`
    const botName = this.generateBotName()

    const botPlayer: Player = {
      userId: botId,
      username: botId,
      nickname: `${botName}(人机)`,
      order: -1,
      board: createEmptyBoard(),
      eliminated: [],
      isReady: false,
      isActive: true,
      isBot: true
    }

    players.set(botId, botPlayer)
    this.updateRoomPlayerList(roomId)

    // 调度人机自动准备（延迟执行，模拟玩家思考时间）
    setTimeout(() => {
      if (room.status === 'waiting') {
        const randomBoard = createRandomBoard()
        this.updatePlayerBoard(roomId, botId, randomBoard, [])
        console.log(`[DB] Bot ${botId} auto-readied`)
      }
    }, 1000 + Math.random() * 2000)
    
    return botPlayer
  }

  /**
   * 注意：人机现在通过 createBotPlayer 中的 setTimeout 自动准备
   * 这个方法保留用于兼容性
   */
  autoDeployBots(roomId: string): void {
    // 人机已在 createBotPlayer 中自动调度准备
    console.log(`[DB] autoDeployBots called, but bots are now auto-readied on creation`)
  }

  // ============================================
  // Room Methods
  // ============================================

  createRoom(id: string, creatorId: string, maxPlayers: number): Room | null {
    if (this.rooms.has(id)) return null

    const now = new Date().toISOString()
    const room: Room = {
      id,
      creatorId,
      maxPlayers: Math.min(Math.max(maxPlayers, 2), 5),
      status: 'waiting',
      currentRound: 0,
      currentTurn: 0,
      turnOrder: [],
      publicArea: [],
      players: [],
      createdAt: now,
      updatedAt: now,
      actedPlayers: [],
      needsSettlement: false
    }

    this.rooms.set(id, room)
    this.roomPlayers.set(id, new Map())
    return room
  }

  getRoom(id: string): Room | null {
    return this.rooms.get(id) ?? null
  }

  getRoomPlayers(roomId: string): Player[] {
    const players = this.roomPlayers.get(roomId)
    if (!players) return []
    return Array.from(players.values()).filter(p => p.isActive)
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values())
  }

  getRoomsByCreator(creatorId: string): Room[] {
    return Array.from(this.rooms.values())
      .filter(room => room.creatorId === creatorId)
  }

  getRoomsByPlayer(userId: string): Room[] {
    const result: Room[] = []
    for (const [roomId, room] of Array.from(this.rooms.entries())) {
      const players = this.roomPlayers.get(roomId)
      if (players?.has(userId)) {
        result.push(room)
      }
    }
    return result
  }

  joinRoom(roomId: string, userId: string, userData: { 
    username: string; 
    nickname: string 
  }): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId)
    if (!room) return { success: false, error: '房间不存在' }

    if (room.status !== 'waiting') {
      return { success: false, error: '游戏已开始' }
    }

    const players = this.roomPlayers.get(roomId)!
    if (players.has(userId)) {
      // Reconnect
      const player = players.get(userId)!
      player.isActive = true
      this.updateRoomPlayerList(roomId)
      return { success: true }
    }

    const activeCount = Array.from(players.values()).filter(p => p.isActive).length
    if (activeCount >= room.maxPlayers) {
      return { success: false, error: '房间已满' }
    }

    const player: Player = {
      userId,
      username: userData.username,
      nickname: userData.nickname,
      order: -1,
      board: createEmptyBoard(),
      eliminated: [],
      isReady: false,
      isActive: true
    }

    players.set(userId, player)
    this.updateRoomPlayerList(roomId)
    
    return { success: true }
  }

  leaveRoom(roomId: string, userId: string): boolean {
    const players = this.roomPlayers.get(roomId)
    if (!players) return false

    const player = players.get(userId)
    if (!player) return false

    if (player.isBot) {
      // Remove bot completely
      players.delete(userId)
    } else {
      // Mark human player as inactive
      player.isActive = false
    }

    this.updateRoomPlayerList(roomId)
    return true
  }

  kickPlayer(roomId: string, userId: string): boolean {
    return this.leaveRoom(roomId, userId)
  }

  updatePlayerBoard(
    roomId: string, 
    userId: string, 
    board: Board, 
    eliminated: number[]
  ): boolean {
    const players = this.roomPlayers.get(roomId)
    if (!players) return false

    const player = players.get(userId)
    if (!player) return false

    player.board = board
    player.eliminated = eliminated
    player.isReady = true

    return true
  }

  updatePlayerOrder(roomId: string, userId: string, order: number): boolean {
    const players = this.roomPlayers.get(roomId)
    if (!players) return false

    const player = players.get(userId)
    if (!player) return false

    player.order = order
    return true
  }

  updateRoomStatus(roomId: string, status: RoomStatus): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    room.status = status
    room.updatedAt = new Date().toISOString()
    return true
  }

  updateRoomGameState(roomId: string, updates: Partial<Room>): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    Object.assign(room, updates)
    room.updatedAt = new Date().toISOString()
    return true
  }

  startGame(roomId: string): { success: boolean; error?: string; turnOrder?: string[] } {
    const room = this.rooms.get(roomId)
    if (!room) return { success: false, error: '房间不存在' }

    const players = this.getRoomPlayers(roomId)
    if (players.length < 2) {
      return { success: false, error: '至少需要2名玩家' }
    }

    // 检查所有玩家是否已准备（部署完成）
    const allReady = players.every(p => p.isReady)
    if (!allReady) {
      return { success: false, error: '还有玩家未完成部署' }
    }

    // Generate random turn order
    const turnOrder = players.map(p => p.userId).sort(() => Math.random() - 0.5)

    // Assign player orders
    turnOrder.forEach((userId, idx) => {
      this.updatePlayerOrder(roomId, userId, idx)
    })

    // Update room status
    room.status = 'playing'
    room.currentRound = 1
    room.currentTurn = 0
    room.turnOrder = turnOrder
    room.publicArea = []
    room.actedPlayers = []
    room.needsSettlement = false
    room.phase = 'deploy'
    room.pendingActions = []
    room.updatedAt = new Date().toISOString()
    this.updateRoomPlayerList(roomId)

    // Trigger event bus - GAME_STARTED
    // 这会创建部署分叉，所有玩家（包括人机）需要重新部署到游戏中
    try {
      const eventBus = getEventBus()
      eventBus.emit({
        id: generateId(),
        type: EventType.GAME_STARTED,
        roomId,
        timestamp: Date.now(),
        payload: { turnOrder },
      })
    } catch (error) {
      console.error('Failed to emit GAME_STARTED event:', error)
    }

    return { success: true, turnOrder }
  }

  endGame(roomId: string, winnerId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    room.status = 'finished'
    room.winner = winnerId
    room.updatedAt = new Date().toISOString()

    // Update stats
    const players = this.getRoomPlayers(roomId)
    for (const player of players) {
      if (player.isBot) continue
      
      const result = player.userId === winnerId ? 'win' : 'loss'
      this.updateUserStats(player.userId, result)
    }

    return true
  }

  advanceTurn(roomId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room || room.status !== 'playing') return false

    room.currentTurn = (room.currentTurn + 1) % room.turnOrder.length
    
    // Check if round ended
    if (room.currentTurn === 0) {
      room.currentRound++
    }

    room.updatedAt = new Date().toISOString()
    
    return true
  }

  movePiece(
    roomId: string, 
    userId: string, 
    from: string, 
    to: string | 'public'
  ): { success: boolean; error?: string; piece?: number } {
    const room = this.rooms.get(roomId)
    if (!room) return { success: false, error: '房间不存在' }

    const players = this.roomPlayers.get(roomId)
    if (!players) return { success: false, error: '玩家不存在' }

    const player = players.get(userId)
    if (!player) return { success: false, error: '玩家不存在' }

    const piece = player.board[from]
    if (piece === null) {
      return { success: false, error: '该位置没有棋子' }
    }

    // Move piece
    player.board[from] = null
    
    if (to === 'public') {
      // Add to public area
      room.publicArea.push({
        number: piece,
        playerId: userId,
        nickname: player.nickname
      })
    } else {
      // Move to another cell
      player.board[to] = piece
    }

    room.updatedAt = new Date().toISOString()
    return { success: true, piece }
  }

  eliminatePiece(roomId: string, userId: string, piece: number): boolean {
    const players = this.roomPlayers.get(roomId)
    if (!players) return false

    const player = players.get(userId)
    if (!player) return false

    if (!player.eliminated.includes(piece)) {
      player.eliminated.push(piece)
    }

    return true
  }

  /**
   * 记录玩家行动
   * 返回是否需要进入结算阶段
   */
  playerAction(roomId: string, userId: string): { 
    success: boolean; 
    error?: string; 
    needSettlement?: boolean 
  } {
    const room = this.rooms.get(roomId)
    if (!room) return { success: false, error: '房间不存在' }
    if (room.status !== 'playing') return { success: false, error: '游戏未开始' }

    // 检查是否已行动
    if (room.actedPlayers.includes(userId)) {
      return { success: false, error: '您本回合已行动' }
    }

    // 记录行动
    room.actedPlayers.push(userId)

    // 检查是否所有玩家都行动了
    const activePlayers = this.getRoomPlayers(roomId).filter(p => p.isActive)
    const allActed = activePlayers.every(p => room.actedPlayers.includes(p.userId))

    if (allActed) {
      room.needsSettlement = true
      return { success: true, needSettlement: true }
    }

    // 移动到下一个玩家
    room.currentTurn = (room.currentTurn + 1) % room.turnOrder.length
    room.updatedAt = new Date().toISOString()

    return { success: true, needSettlement: false }
  }

  /**
   * 执行结算
   */
  settleRound(roomId: string): {
    success: boolean
    extraTurnPlayer?: string
    eliminated: Array<{ playerId: string; number: number }>
  } {
    const room = this.rooms.get(roomId)
    if (!room) return { success: false, eliminated: [] }

    const eliminated: Array<{ playerId: string; number: number }> = []

    // 根据公共区域情况处理
    if (room.publicArea.length === 0) {
      // 无棋子，回合正常结束
      this.endRound(roomId)
      return { success: true, eliminated: [] }
    }

    if (room.publicArea.length === 1) {
      // 单棋子，该玩家获得额外回合
      const playerId = room.publicArea[0].playerId
      this.endRound(roomId, playerId)
      return { success: true, extraTurnPlayer: playerId, eliminated: [] }
    }

    // 多棋子，进行对决
    // TODO: 实现对决逻辑
    
    this.endRound(roomId)
    return { success: true, eliminated }
  }

  /**
   * 结束当前回合，准备下一轮
   */
  private endRound(roomId: string, extraTurnPlayer?: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    // 清空公共区域（棋子回收）
    room.publicArea = []
    
    // 重置行动记录
    room.actedPlayers = []
    room.needsSettlement = false

    if (extraTurnPlayer) {
      // 设置额外回合
      const idx = room.turnOrder.indexOf(extraTurnPlayer)
      if (idx >= 0) {
        room.currentTurn = idx
      }
    } else {
      // 正常进入下一轮
      room.currentRound++
      room.currentTurn = 0
    }

    room.updatedAt = new Date().toISOString()
  }

  private updateRoomPlayerList(roomId: string): void {
    const room = this.rooms.get(roomId)
    const players = this.roomPlayers.get(roomId)
    if (room && players) {
      room.players = Array.from(players.values())
    }
  }

  // ============================================
  // Leaderboard
  // ============================================

  getLeaderboard(limit: number = 20): Array<{
    rank: number
    nickname: string
    wins: number
    losses: number
    totalGames: number
    winRate: number
  }> {
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
      .map((u, idx) => ({ ...u, rank: idx + 1 }))

    return users
  }

  // ============================================
  // Cleanup
  // ============================================

  cleanupOldRooms(maxAgeHours: number = 24): number {
    const now = Date.now()
    const maxAge = maxAgeHours * 60 * 60 * 1000
    let cleaned = 0

    for (const [id, room] of Array.from(this.rooms.entries())) {
      const age = now - new Date(room.updatedAt).getTime()
      if (age > maxAge && room.status !== 'playing') {
        this.rooms.delete(id)
        this.roomPlayers.delete(id)
        cleaned++
      }
    }

    return cleaned
  }
}

// ============================================
// Singleton Instance
// ============================================

export const db = new Database()

// Periodic cleanup
setInterval(() => {
  const cleaned = db.cleanupOldRooms()
  if (cleaned > 0) {
    console.log(`[DB] Cleaned up ${cleaned} old rooms`)
  }
}, 60 * 60 * 1000) // Every hour

// ============================================
// Event Bus Initialization
// ============================================

// Initialize event bus when the module is loaded (server-side only)
if (typeof window === 'undefined') {
  // Dynamic import to avoid client-side issues
  import('./event-bus').then(({ initializeEventBus }) => {
    initializeEventBus()
    console.log('[EventBus] Initialized')
  }).catch(err => {
    console.error('[EventBus] Failed to initialize:', err)
  })
}
