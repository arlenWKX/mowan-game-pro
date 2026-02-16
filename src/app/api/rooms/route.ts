// ============================================
// Rooms API - 房间列表和创建
// ============================================

import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { generateRoomId } from "@/lib/utils"
import { 
  withAuth, 
  authenticate,
  successResponse, 
  validateNumber 
} from "@/lib/api"

// Get all rooms or user's rooms
export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const myRooms = searchParams.get('my') === '1'
  
  if (myRooms) {
    // Get rooms created by current user
    const auth = authenticate(req)
    const rooms = db.getRoomsByCreator(auth.userId)
    return successResponse({ rooms })
  }
  
  const rooms = db.getAllRooms()
  return successResponse({ rooms })
})

// Create a new room
export const POST = withAuth(async (req, { auth }) => {
  const body = await req.json()
  
  const maxPlayers = validateNumber(body.max_players, '玩家人数', {
    min: 2,
    max: 5,
    integer: true
  })

  // Generate unique room ID
  let roomId: string
  let attempts = 0
  const MAX_ATTEMPTS = 10
  
  do {
    roomId = generateRoomId()
    attempts++
  } while (db.getRoom(roomId) && attempts < MAX_ATTEMPTS)

  if (attempts >= MAX_ATTEMPTS) {
    throw new Error('无法生成房间ID，请重试')
  }

  // Create room
  const room = db.createRoom(roomId, auth.userId, maxPlayers)
  if (!room) {
    throw new Error('创建房间失败')
  }

  // Creator joins the room
  const user = db.getUserById(auth.userId)
  if (!user) {
    throw new Error('用户不存在')
  }
  
  const joinResult = db.joinRoom(roomId, auth.userId, {
    username: user.username,
    nickname: user.nickname
  })
  
  if (!joinResult.success) {
    // Clean up the room if join failed
    // Note: In a real database we would use transactions
    console.error(`[Create Room] Creator failed to join: ${joinResult.error}`)
    throw new Error(`加入房间失败: ${joinResult.error}`)
  }

  return successResponse({ room_id: roomId }, '房间创建成功')
})
