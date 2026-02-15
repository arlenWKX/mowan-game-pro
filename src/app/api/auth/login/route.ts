import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyPassword, generateToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      )
    }

    const user = db.getUserByUsername(username)
    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      )
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin
    })

    return NextResponse.json({
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        isAdmin: user.isAdmin
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: "登录失败" },
      { status: 500 }
    )
  }
}