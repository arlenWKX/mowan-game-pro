"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Gamepad2, Puzzle, Trophy, Sparkles } from "lucide-react"
import { showToast } from "@/components/toaster"

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [serverUrl, setServerUrl] = useState("")

  useEffect(() => {
    setServerUrl(localStorage.getItem("serverUrl") || "")
    const token = localStorage.getItem("token")
    if (token) {
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? setIsLoggedIn(true) : setIsLoggedIn(false))
        .catch(() => setIsLoggedIn(false))
    }
  }, [])

  const saveServerUrl = () => {
    localStorage.setItem("serverUrl", serverUrl)
    showToast("服务器地址已保存", "success")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <Card className="mb-8 border-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-background">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="mb-6 inline-block">
            <Sparkles className="w-16 h-16 text-primary animate-pulse" />
          </div>
          <h1 className="text-5xl font-bold mb-4 gradient-text">
            魔丸小游戏
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            策略推理 · 数字对决 · 智谋较量
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            {isLoggedIn ? (
              <Link href="/rooms">
                <Button size="lg" className="animate-glow">
                  <Gamepad2 className="w-5 h-5 mr-2" />
                  开始游戏
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="lg" className="animate-glow">
                  登录 / 注册
                </Button>
              </Link>
            )}
            <Link href="/offline">
              <Button size="lg" variant="outline">
                <Puzzle className="w-5 h-5 mr-2" />
                离线模式
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Server Settings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>服务器设置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="留空使用当前域名"
            />
            <Button onClick={saveServerUrl}>保存</Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            用于连接后端服务器，默认使用当前域名
          </p>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="text-center hover:border-primary/50 transition-colors">
          <CardContent className="pt-8">
            <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">策略对战</h3>
            <p className="text-muted-foreground">2-5人实时对战，考验你的策略思维</p>
          </CardContent>
        </Card>
        <Card className="text-center hover:border-primary/50 transition-colors">
          <CardContent className="pt-8">
            <Puzzle className="w-12 h-12 mx-auto mb-4 text-secondary" />
            <h3 className="text-lg font-semibold mb-2">独特规则</h3>
            <p className="text-muted-foreground">反向排序对决，特殊数字克制关系</p>
          </CardContent>
        </Card>
        <Card className="text-center hover:border-primary/50 transition-colors">
          <CardContent className="pt-8">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-lg font-semibold mb-2">排行榜</h3>
            <p className="text-muted-foreground">与全球玩家一较高下</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}