import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function DELETE(
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
    if (!payload || !payload.isAdmin) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 })
    }

    const success = db.deleteUser(params.id)
    if (!success) {
      return NextResponse.json({ error: "删除失败" }, { status: 400 })
    }

    return NextResponse.json({ message: "已删除" })
  } catch (error) {
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}