"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Medal, Award, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LeaderboardEntry } from "@/types"

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/leaderboard")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUsers(data.data.leaderboard)
        } else {
          setError(data.error || "加载失败")
        }
        setLoading(false)
      })
      .catch(() => {
        setError("网络错误")
        setLoading(false)
      })
  }, [])

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return { icon: Trophy, className: "text-yellow-500 bg-yellow-500/10", label: "冠军" }
      case 1:
        return { icon: Medal, className: "text-gray-400 bg-gray-400/10", label: "亚军" }
      case 2:
        return { icon: Award, className: "text-amber-600 bg-amber-600/10", label: "季军" }
      default:
        return { icon: null, className: "text-muted-foreground bg-muted", label: String(index + 1) }
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8">排行榜</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            胜率排行
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">加载中...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">暂无数据，快来成为第一位玩家吧！</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:-mx-6">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 sm:px-6 font-medium text-muted-foreground">排名</th>
                    <th className="text-left py-3 px-4 sm:px-6 font-medium text-muted-foreground">玩家</th>
                    <th className="text-right py-3 px-4 sm:px-6 font-medium text-muted-foreground">胜场</th>
                    <th className="text-right py-3 px-4 sm:px-6 font-medium text-muted-foreground">败场</th>
                    <th className="text-right py-3 px-4 sm:px-6 font-medium text-muted-foreground">总场次</th>
                    <th className="text-right py-3 px-4 sm:px-6 font-medium text-muted-foreground">胜率</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => {
                    const rankStyle = getRankStyle(index)
                    const Icon = rankStyle.icon
                    
                    return (
                      <tr 
                        key={user.nickname} 
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-2">
                            {Icon ? (
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", rankStyle.className)}>
                                <Icon className="w-4 h-4" />
                              </div>
                            ) : (
                              <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                                {rankStyle.label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 sm:px-6">
                          <div className="font-medium">{user.nickname}</div>
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <span className="text-green-600 font-medium">{user.wins}</span>
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-right text-muted-foreground">
                          {user.losses}
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-right text-muted-foreground">
                          {user.totalGames}
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <span className={cn(
                            "font-bold",
                            user.winRate >= 60 ? "text-green-500" :
                            user.winRate >= 40 ? "text-yellow-500" :
                            "text-muted-foreground"
                          )}>
                            {user.winRate}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
