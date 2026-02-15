"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Medal, Award } from "lucide-react"

interface LeaderboardEntry {
  nickname: string
  wins: number
  losses: number
  totalGames: number
  winRate: number
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/leaderboard")
      .then(res => res.json())
      .then(data => {
        setUsers(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />
    return <span className="w-5 h-5 flex items-center justify-center font-bold">{index + 1}</span>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">排行榜</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>胜率排行</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">暂无数据</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">排名</th>
                    <th className="text-left py-3 px-4">玩家</th>
                    <th className="text-right py-3 px-4">胜场</th>
                    <th className="text-right py-3 px-4">败场</th>
                    <th className="text-right py-3 px-4">总场次</th>
                    <th className="text-right py-3 px-4">胜率</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={user.nickname} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4">{getRankIcon(index)}</td>
                      <td className="py-3 px-4 font-medium">{user.nickname}</td>
                      <td className="py-3 px-4 text-right">{user.wins}</td>
                      <td className="py-3 px-4 text-right">{user.losses}</td>
                      <td className="py-3 px-4 text-right">{user.totalGames}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={user.winRate >= 50 ? "text-green-500" : "text-muted-foreground"}>
                          {user.winRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}