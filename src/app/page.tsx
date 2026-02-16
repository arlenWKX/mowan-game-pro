"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/hooks"
import { Gamepad2, Puzzle, Trophy, Sparkles, Users, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const { isAuthenticated } = useAuth()

  const features = [
    {
      icon: Users,
      title: "多人对战",
      description: "支持2-5人实时对战，与好友一起竞技",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      icon: Puzzle,
      title: "独特规则",
      description: "反向排序对决，0吃6/9，8吃0",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      icon: Zap,
      title: "人机对战",
      description: "随时添加人机对手，单人也能畅玩",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    },
    {
      icon: Trophy,
      title: "排行榜",
      description: "胜率排名，与全球玩家一较高下",
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-secondary/20 to-background mb-12">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
        <CardContent className="relative py-16 sm:py-20 text-center px-4">
          <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              魔丸小游戏
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            策略推理 · 数字对决 · 智谋较量
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Link href="/rooms">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8">
                  <Gamepad2 className="w-5 h-5 mr-2" />
                  开始游戏
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8">
                  登录 / 注册
                </Button>
              </Link>
            )}
            <Link href="/offline">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <Puzzle className="w-5 h-5 mr-2" />
                离线练习
              </Button>
            </Link>
          </div>
        </CardContent>
      </section>

      {/* Features Grid */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-center mb-8">游戏特色</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
            >
              <CardContent className="pt-6">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                  feature.bgColor
                )}>
                  <feature.icon className={cn("w-6 h-6", feature.color)} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="text-2xl font-bold text-center mb-8">快速开始</h2>
        <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          <Link href="/rules">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <div className="text-2xl mb-2">📖</div>
                <h3 className="font-medium">查看规则</h3>
                <p className="text-sm text-muted-foreground mt-1">了解游戏玩法</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/leaderboard">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <div className="text-2xl mb-2">🏆</div>
                <h3 className="font-medium">排行榜</h3>
                <p className="text-sm text-muted-foreground mt-1">查看高手排名</p>
              </CardContent>
            </Card>
          </Link>
          <Link href={isAuthenticated ? "/rooms" : "/register"}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <div className="text-2xl mb-2">🚀</div>
                <h3 className="font-medium">{isAuthenticated ? "创建房间" : "注册账号"}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isAuthenticated ? "开始一场对战" : "加入魔丸世界"}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  )
}
