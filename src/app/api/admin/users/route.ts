import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload || !payload.isAdmin) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 })
    }

    const users = db.getAllUsers()
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json(
      { error: "获取用户列表失败" },
      { status: 500 }
    )
  }
}