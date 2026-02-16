// ============================================
// Get Current User API - 获取当前用户信息
// ============================================

import { db } from "@/lib/db"
import { withAuth, successResponse, NotFoundError } from "@/lib/api"

export const GET = withAuth(async (req, { auth }) => {
  const user = db.getUserById(auth.userId)
  if (!user) {
    throw new NotFoundError('用户不存在')
  }

  return successResponse(user)
})
