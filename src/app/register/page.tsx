"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { showToast } from "@/components/toaster"
import { useAuth } from "@/hooks"
import { Loader2 } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    nickname: ""
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.username.trim() || !formData.password || !formData.nickname.trim()) {
      showToast("请填写所有字段", "error")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      showToast("两次输入的密码不一致", "error")
      return
    }

    if (formData.username.length < 3) {
      showToast("用户名至少需要3个字符", "error")
      return
    }

    if (formData.password.length < 6) {
      showToast("密码至少需要6个字符", "error")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          nickname: formData.nickname
        })
      })

      const data = await res.json()
      
      if (res.ok && data.success) {
        login(data.data.token, data.data.user)
        showToast(data.message || "注册成功", "success")
        router.push("/rooms")
      } else {
        showToast(data.error || "注册失败", "error")
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
          <CardTitle className="text-center">注册</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">用户名</label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="3-20位字母数字或下划线"
                autoComplete="username"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">昵称</label>
              <Input
                value={formData.nickname}
                onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                placeholder="2-20位字符"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">密码</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="至少6位字符"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">确认密码</label>
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="再次输入密码"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  注册中...
                </>
              ) : (
                "注册"
              )}
            </Button>
          </form>
          <p className="text-center mt-4 text-sm text-muted-foreground">
            已有账号？<Link href="/login" className="text-primary hover:underline">立即登录</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
