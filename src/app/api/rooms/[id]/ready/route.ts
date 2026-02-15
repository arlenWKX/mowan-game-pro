import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/auth"
import { isValidBoard } from "@/lib/utils"

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

    const { board } = await req.json()

    if (!isValidBoard(board)) {
      return NextResponse.json(
        { error: "棋盘必须放置10个数字" },
        { status: 400 }
      )
    }

    db.updatePlayerBoard(params.id, payload.userId, board, [])

    return NextResponse.json({ message: "部署完成" })
  } catch (error) {
    return NextResponse.json(
      { error: "部署失败" },
      { status: 500 }
    )
  }
}