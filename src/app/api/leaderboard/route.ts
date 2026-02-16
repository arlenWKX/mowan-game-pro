// ============================================
// Leaderboard API - 排行榜
// ============================================

import { db } from "@/lib/db"
import { successResponse, withErrorHandler } from "@/lib/api"
import { NextRequest } from "next/server"

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  
  const leaderboard = db.getLeaderboard(Math.min(limit, 100))
  return successResponse({ leaderboard })
})
