"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { showToast } from "@/components/toaster"
import { Ban, UserCheck, Trash2, Shield } from "lucide-react"

interface User {
  id: string
  username: string
  nickname: string
  isAdmin: boolean
  wins: number
  losses: number
  totalGames: number
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setUsers(await res.json())
      } else {
        showToast("获取用户列表失败", "error")
      }
    } catch (error) {
      showToast("网络错误", "error")
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm("确定删除此用户？")) return
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        showToast("已删除", "success")
        loadUsers()
      }
    } catch (error) {
      showToast("删除失败", "error")
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-8">
        <Shield className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">用户管理</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">ID</th>
                    <th className="text-left py-3 px-4">用户名</th>
                    <th className="text-left py-3 px-4">昵称</th>
                    <th className="text-left py-3 px-4">管理员</th>
                    <th className="text-right py-3 px-4">胜/败/总</th>
                    <th className="text-right py-3 px-4">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4 text-sm text-muted-foreground">{user.id.slice(0, 8)}</td>
                      <td className="py-3 px-4">{user.username}</td>
                      <td className="py-3 px-4">{user.nickname}</td>
                      <td className="py-3 px-4">{user.isAdmin ? "是" : "否"}</td>
                      <td className="py-3 px-4 text-right">
                        {user.wins}/{user.losses}/{user.totalGames}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!user.isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteUser(user.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
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