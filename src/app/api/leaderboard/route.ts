import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const leaderboard = db.getLeaderboard(20)
    return NextResponse.json(leaderboard)
  } catch (error) {
    return NextResponse.json(
      { error: "获取排行榜失败" },
      { status: 500 }
    )
  }
}