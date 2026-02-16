// ============================================
// Admin Users API - 管理员用户管理
// ============================================

import { db } from "@/lib/db"
import { withAdmin, successResponse } from "@/lib/api"

export const GET = withAdmin(async () => {
  const users = db.getAllUsers()
  return successResponse({ users })
})
