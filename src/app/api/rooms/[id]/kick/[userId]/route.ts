import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
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

    if (room.creatorId !== payload.userId) {
      return NextResponse.json({ error: "只有房主可以踢人" }, { status: 403 })
    }

    db.kickPlayer(params.id, params.userId)
    return NextResponse.json({ message: "已踢出玩家" })
  } catch (error) {
    return NextResponse.json({ error: "操作失败" }, { status: 500 })
  }
}