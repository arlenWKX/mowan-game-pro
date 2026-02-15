import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const room = db.getRoom(params.id)
    if (!room) {
      return NextResponse.json({ error: "房间不存在" }, { status: 404 })
    }

    if (room.status !== "waiting") {
      return NextResponse.json({ error: "游戏已开始" }, { status: 400 })
    }

    const players = db.getRoomPlayers(params.id)
    if (players.length >= room.maxPlayers) {
      return NextResponse.json({ error: "房间已满" }, { status: 400 })
    }

    // Check if already in room
    if (players.some(p => p.userId === payload.userId)) {
      return NextResponse.json({ message: "已在房间中" })
    }

    const user = db.getUserById(payload.userId)
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const success = db.joinRoom(params.id, payload.userId, {
      username: user.username,
      nickname: user.nickname
    })

    if (!success) {
      return NextResponse.json({ error: "加入房间失败" }, { status: 500 })
    }

    return NextResponse.json({ message: "加入房间成功" })
  } catch (error) {
    return NextResponse.json(
      { error: "加入房间失败" },
      { status: 500 }
    )
  }
}