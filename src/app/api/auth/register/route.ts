// ============================================
// Register API - 用户注册
// ============================================

import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { hashPassword, generateToken } from "@/lib/auth"
import { successResponse, errorResponse, ConflictError } from "@/lib/api"
import { validateString } from "@/lib/api"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const username = validateString(body.username, '用户名', { 
      min: 3, 
      max: 20,
      pattern: /^[a-zA-Z0-9_]+$/
    })
    const password = validateString(body.password, '密码', { min: 6, max: 50 })
    const nickname = validateString(body.nickname, '昵称', { min: 2, max: 20 })

    const hashedPassword = hashPassword(password)
    const user = db.createUser({
      username,
      password: hashedPassword,
      nickname
    })

    if (!user) {
      throw new ConflictError('用户名已存在')
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin
    })

    return successResponse({
      token,
      user
    }, '注册成功')
  } catch (error) {
    return errorResponse(error as Error)
  }
}
