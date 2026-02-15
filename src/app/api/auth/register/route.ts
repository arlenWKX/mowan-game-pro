import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { username, password, nickname } = await req.json()

    if (!username || !password || !nickname) {
      return NextResponse.json(
        { error: "请填写所有字段" },
        { status: 400 }
      )
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: "用户名至少3个字符" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码至少6个字符" },
        { status: 400 }
      )
    }

    const user = db.createUser({ username, password, nickname })

    if (!user) {
      return NextResponse.json(
        { error: "用户名已存在" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { message: "注册成功", userId: user.id },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: "注册失败" },
      { status: 500 }
    )
  }
}