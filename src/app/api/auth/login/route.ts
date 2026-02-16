// ============================================
// Login API - 用户登录
// ============================================

import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { verifyPassword, generateToken } from "@/lib/auth"
import { successResponse, errorResponse, UnauthorizedError } from "@/lib/api"
import { validateString } from "@/lib/api"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const username = validateString(body.username, '用户名', { min: 3, max: 20 })
    const password = validateString(body.password, '密码', { min: 6, max: 50 })

    const user = db.getUserByUsername(username)
    if (!user) {
      throw new UnauthorizedError('用户名或密码错误')
    }

    if (!verifyPassword(password, user.password)) {
      throw new UnauthorizedError('用户名或密码错误')
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin
    })

    return successResponse({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        isAdmin: user.isAdmin,
        wins: user.wins,
        losses: user.losses,
        totalGames: user.totalGames
      }
    }, '登录成功')
  } catch (error) {
    return errorResponse(error as Error)
  }
}
