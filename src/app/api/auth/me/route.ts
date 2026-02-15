import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "未授权" },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: "无效的令牌" },
        { status: 401 }
      )
    }

    const user = db.getUserById(payload.userId)
    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      isAdmin: user.isAdmin
    })
  } catch (error) {
    return NextResponse.json(
      { error: "获取用户信息失败" },
      { status: 500 }
    )
  }
}