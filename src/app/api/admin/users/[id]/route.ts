// ============================================
// Admin User Detail API - 管理员用户详情操作
// ============================================

import { db } from "@/lib/db"
import { withAdmin, successResponse, NotFoundError } from "@/lib/api"

export const DELETE = withAdmin(async (req, { params }) => {
  const { id } = params as { id: string }
  const user = db.getUserById(id)
  if (!user) {
    throw new NotFoundError('用户不存在')
  }

  if (user.isAdmin) {
    throw new Error('不能删除管理员账号')
  }

  db.deleteUser(id)
  return successResponse(null, '用户已删除')
})
