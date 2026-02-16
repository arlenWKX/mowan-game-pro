"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { showToast } from "@/components/toaster"
import { useAuth } from "@/hooks"
import { Trash2, Shield, Loader2, AlertCircle, RefreshCw, Users, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { User } from "@/types"

export default function AdminPage() {
  const router = useRouter()
  const { token, user, isLoading: isAuthLoading } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Check admin permission
  useEffect(() => {
    if (isAuthLoading) return
    
    if (!token) {
      showToast("请先登录", "error")
      router.push("/login")
      return
    }
    
    if (!user?.isAdmin) {
      showToast("您没有权限访问此页面", "error")
      router.push("/")
      return
    }
  }, [token, user, isAuthLoading, router])

  const loadUsers = useCallback(async () => {
    if (!token) return
    
    setLoading(true)
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const data = await res.json()
      
      if (res.ok && data.success) {
        setUsers(data.data.users)
      } else {
        showToast(data.error || "获取用户列表失败", "error")
      }
    } catch (error) {
      showToast("网络错误", "error")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const deleteUser = async (userId: string) => {
    if (!token) return
    if (!confirm("确定删除此用户？此操作不可恢复。")) return
    
    setDeleting(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const data = await res.json()
      
      if (res.ok && data.success) {
        showToast(data.message || "已删除", "success")
        loadUsers()
      } else {
        showToast(data.error || "删除失败", "error")
      }
    } catch (error) {
      showToast("网络错误", "error")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">管理后台</h1>
            <p className="text-sm text-muted-foreground">用户管理</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadUsers} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          刷新
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="w-4 h-4" />
              总用户数
            </div>
            <div className="text-2xl font-bold mt-1">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Shield className="w-4 h-4" />
              管理员
            </div>
            <div className="text-2xl font-bold mt-1">
              {users.filter(u => u.isAdmin).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="w-4 h-4" />
              活跃玩家
            </div>
            <div className="text-2xl font-bold mt-1">
              {users.filter(u => u.totalGames > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">加载中...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">暂无用户数据</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:-mx-6">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 sm:px-6 font-medium text-muted-foreground">用户</th>
                    <th className="text-left py-3 px-4 sm:px-6 font-medium text-muted-foreground">角色</th>
                    <th className="text-right py-3 px-4 sm:px-6 font-medium text-muted-foreground">胜场</th>
                    <th className="text-right py-3 px-4 sm:px-6 font-medium text-muted-foreground">败场</th>
                    <th className="text-right py-3 px-4 sm:px-6 font-medium text-muted-foreground">总场次</th>
                    <th className="text-right py-3 px-4 sm:px-6 font-medium text-muted-foreground">胜率</th>
                    <th className="text-right py-3 px-4 sm:px-6 font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => {
                    const winRate = user.totalGames > 0 
                      ? Math.round((user.wins / user.totalGames) * 1000) / 10 
                      : 0
                    
                    return (
                      <tr 
                        key={user.id} 
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4 sm:px-6">
                          <div>
                            <div className="font-medium">{user.nickname}</div>
                            <div className="text-xs text-muted-foreground">@{user.username}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 sm:px-6">
                          {user.isAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                              <Shield className="w-3 h-3" />
                              管理员
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">用户</span>
                          )}
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right">
                          <span className="text-green-600 font-medium">{user.wins}</span>
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right text-muted-foreground">
                          {user.losses}
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right text-muted-foreground">
                          {user.totalGames}
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right">
                          <span className={cn(
                            "font-medium",
                            winRate >= 60 ? "text-green-500" :
                            winRate >= 40 ? "text-yellow-500" :
                            "text-muted-foreground"
                          )}>
                            {winRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right">
                          {!user.isAdmin && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => deleteUser(user.id)}
                              disabled={deleting === user.id}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              {deleting === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          )}
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
