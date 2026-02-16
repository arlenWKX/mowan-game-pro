"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { showToast } from "@/components/toaster"
import { useAuth } from "@/hooks"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { token, isLoading: isAuthLoading, login } = useAuth()
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  })
  const [loading, setLoading] = useState(false)

  // 如果已登录，直接跳转到房间列表
  useEffect(() => {
    if (!isAuthLoading && token) {
      router.push("/rooms")
    }
  }, [token, isAuthLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.username.trim() || !formData.password) {
      showToast("请填写用户名和密码", "error")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      
      if (res.ok && data.success) {
        // 使用 useAuth 提供的 login 方法
        login(data.data.token, data.data.user)
        showToast(data.message || "登录成功", "success")
        router.push("/rooms")
      } else {
        showToast(data.error || "登录失败", "error")
      }
    } catch (error) {
      showToast("网络错误，请稍后重试", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">登录</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">用户名</label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="请输入用户名"
                autoComplete="username"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">密码</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="请输入密码"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  登录中...
                </>
              ) : (
                "登录"
              )}
            </Button>
          </form>
          <p className="text-center mt-4 text-sm text-muted-foreground">
            还没有账号？<Link href="/register" className="text-primary hover:underline">立即注册</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
