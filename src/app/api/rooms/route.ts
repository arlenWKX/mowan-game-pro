import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/auth"
import { generateRoomId } from "@/lib/utils"

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "无效的令牌" }, { status: 401 })
    }

    const { max_players = 2 } = await req.json()

    if (max_players < 2 || max_players > 5) {
      return NextResponse.json(
        { error: "玩家人数必须是2-5" },
        { status: 400 }
      )
    }

    const roomId = generateRoomId()
    const room = db.createRoom(roomId, payload.userId, max_players)

    if (!room) {
      return NextResponse.json(
        { error: "创建房间失败" },
        { status: 500 }
      )
    }

    // Creator joins room
    const user = db.getUserById(payload.userId)
    if (user) {
      db.joinRoom(roomId, payload.userId, {
        username: user.username,
        nickname: user.nickname
      })
    }

    return NextResponse.json({
      room_id: roomId,
      message: "房间创建成功"
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "创建房间失败" },
      { status: 500 }
    )
  }
}