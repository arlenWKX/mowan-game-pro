"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { showToast } from "@/components/toaster"
import { useAuth, useRoom } from "@/hooks"
import { useDeployment } from "@/hooks/useDeployment"
import { DeploymentPanel } from "@/components/deployment-panel"
import { GamePlayPanel } from "@/components/game-play-panel"
import { cn } from "@/lib/utils"
import { 
  ArrowLeft, 
  Users, 
  Play, 
  UserX, 
  Crown, 
  Bot, 
  Plus, 
  Loader2,
  AlertCircle,
  LogOut,
  CheckCircle2,
  Clock,
  Hourglass
} from "lucide-react"
import type { Player } from "@/types"

/**
 * 房间页面
 * 
 * 主要功能:
 * 1. 等待阶段: 显示玩家列表，房主可以开始游戏
 * 2. 部署阶段: 玩家放置数字 0-9 到棋盘上
 * 3. 游戏阶段: 进行游戏，移动棋子，对决
 */
export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string
  
  const [mounted, setMounted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [startingGame, setStartingGame] = useState(false)
  
  // 认证状态
  const { token, user, isLoading: isAuthLoading } = useAuth()
  
  // 房间状态
  const {
    room,
    players,
    gameState,
    isLoading,
    leaveRoom,
    kickPlayer,
    addBot,
    startGame,
    refresh
  } = useRoom(roomId, token)
  
  // 部署状态
  const deployment = useDeployment()

  // 客户端挂载
  useEffect(() => {
    setMounted(true)
  }, [])

  // 检查登录状态
  useEffect(() => {
    if (mounted && !isAuthLoading && !token) {
      showToast("请先登录", "error")
      router.push("/login")
    }
  }, [token, isAuthLoading, router, mounted])

  // 处理部署提交
  const handleDeploy = useCallback(async () => {
    if (!token || !deployment.isComplete) return
    
    setSubmitting(true)
    try {
      const result = await deployment.submit(token, roomId)
      if (result.success) {
        showToast("部署完成！等待其他玩家...", "success")
      } else {
        showToast(result.error || "部署失败", "error")
      }
    } finally {
      setSubmitting(false)
    }
  }, [token, roomId, deployment, deployment.isComplete])

  // 处理离开房间
  const handleLeave = useCallback(async () => {
    await leaveRoom()
    router.push("/rooms")
  }, [leaveRoom, router])

  // 处理开始游戏
  const handleStartGame = useCallback(async () => {
    if (!allPlayersReady) {
      showToast("等待所有玩家完成部署...", "info")
      return
    }
    setStartingGame(true)
    try {
      await startGame()
    } finally {
      setStartingGame(false)
    }
  }, [startGame])

  // 判断权限
  const isCreator = room?.creatorId === user?.id
  const readyCount = players.filter(p => p.isReady).length
  const totalPlayers = players.length
  const allPlayersReady = totalPlayers >= 2 && readyCount === totalPlayers
  const canStart = isCreator && room?.status === "waiting" && totalPlayers >= 2
  const canAddBot = isCreator && room?.status === "waiting" && totalPlayers < (room?.maxPlayers || 2)
  
  // 判断当前玩家是否已准备（部署完成）
  const currentPlayer = players.find(p => p.userId === user?.id)
  const isReady = currentPlayer?.isReady ?? false

  // 获取玩家状态显示
  const getPlayerDeployStatus = (player: Player) => {
    if (player.isReady) {
      return { 
        label: '已准备', 
        icon: CheckCircle2,
        color: 'text-green-600 bg-green-500/10 border-green-500/30' 
      }
    }
    if (player.isBot) {
      return { 
        label: '准备中...', 
        icon: Loader2,
        color: 'text-blue-600 bg-blue-500/10 border-blue-500/30' 
      }
    }
    return { 
      label: '部署中...', 
      icon: Hourglass,
      color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/30' 
    }
  }

  // 加载中
  if (!mounted || isLoading || isAuthLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">加载中...</p>
      </div>
    )
  }

  // 房间不存在
  if (!room) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">房间不存在</h2>
          <p className="text-muted-foreground mb-6">该房间可能已被删除或已过期</p>
          <Link href="/rooms">
            <Button>返回房间列表</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      {/* 头部 */}
      <header className="flex items-center gap-3 mb-6">
        <Link href="/rooms">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold truncate">
            房间 {room.id}
          </h1>
          <p className="text-sm text-muted-foreground">
            {room.status === "waiting" && "等待中 - 部署数字准备游戏"}
            {room.status === "playing" && `第 ${room.currentRound} 回合 - 游戏进行中`}
            {room.status === "finished" && "游戏已结束"}
          </p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={handleLeave}
          size="sm"
          className="shrink-0"
        >
          <LogOut className="w-4 h-4 mr-1.5" />
          离开
        </Button>
      </header>

      {/* 玩家列表 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5 text-muted-foreground" />
            玩家 ({players.length}/{room.maxPlayers})
            {room.status === "waiting" && (
              <span className="text-xs text-muted-foreground ml-auto">
                {readyCount}/{totalPlayers} 已准备
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 准备进度条 */}
          {room.status === "waiting" && (
            <div className="mb-4">
              <Progress 
                value={(readyCount / totalPlayers) * 100} 
                className="h-2"
              />
            </div>
          )}
          
          <div className="space-y-2">
            {players.map((player: Player) => {
              const deployStatus = getPlayerDeployStatus(player)
              const StatusIcon = deployStatus.icon
              
              return (
                <div 
                  key={player.userId} 
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    player.userId === user?.id ? "bg-primary/5 border-primary/20" : "bg-muted/50 border-transparent",
                    room.status === "waiting" && player.isReady && "border-green-500/30"
                  )}
                >
                  {/* 头像 */}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    player.isBot 
                      ? "bg-secondary text-secondary-foreground" 
                      : "bg-primary text-primary-foreground"
                  )}>
                    {player.isBot ? <Bot className="w-5 h-5" /> : player.nickname[0]}
                  </div>
                  
                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium truncate">{player.nickname}</span>
                      {player.userId === room.creatorId && (
                        <Crown className="w-4 h-4 text-yellow-500 shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {player.userId === room.creatorId ? "房主" : "玩家"}
                      {player.isBot && " · 人机"}
                    </div>
                  </div>
                  
                  {/* 部署状态指示器 */}
                  {room.status === "waiting" && (
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0",
                      deployStatus.color
                    )}>
                      <StatusIcon className={cn("w-3.5 h-3.5", !player.isReady && player.isBot && "animate-spin")} />
                      {deployStatus.label}
                    </div>
                  )}
                  
                  {/* 踢出按钮 */}
                  {isCreator && player.userId !== user?.id && room.status === "waiting" && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => kickPlayer(player.userId)}
                      className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )
            })}
            
            {/* 添加人机按钮 */}
            {canAddBot && (
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={addBot}
              >
                <Plus className="w-4 h-4 mr-2" />
                添加人机
              </Button>
            )}
          </div>
          
          {/* 开始游戏按钮 */}
          {canStart && (
            <Button 
              onClick={handleStartGame} 
              disabled={startingGame || !allPlayersReady}
              className="w-full mt-4"
            >
              {startingGame ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {allPlayersReady ? "开始游戏" : `等待玩家准备 (${readyCount}/${totalPlayers})`}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 部署阶段 */}
      {room.status === "waiting" && !isReady && (
        <DeploymentPanel
          board={deployment.board}
          deployedCount={deployment.deployedCount}
          isComplete={deployment.isComplete}
          nextNumber={deployment.nextNumber}
          onCellClick={deployment.handleCellClick}
          onReset={deployment.reset}
          onSubmit={handleDeploy}
          isSubmitting={submitting}
        />
      )}

      {/* 已部署，等待其他玩家 */}
      {room.status === "waiting" && isReady && (
        <Card className="bg-green-500/5 border-green-500/30">
          <CardContent className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-green-700 mb-2">
              部署完成！
            </h3>
            <p className="text-green-600/80 mb-4">
              等待其他玩家完成部署...
            </p>
            
            {/* 显示其他玩家的准备状态 */}
            <div className="mt-4 space-y-2 max-w-sm mx-auto">
              {players.filter(p => p.userId !== user?.id).map((player) => (
                <div 
                  key={player.userId}
                  className={cn(
                    "flex items-center justify-between px-4 py-2 rounded-lg text-sm",
                    player.isReady 
                      ? "bg-green-500/10 text-green-700" 
                      : "bg-yellow-500/10 text-yellow-700"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {player.isBot ? <Bot className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                    {player.nickname}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {player.isReady ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        已准备
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 animate-pulse" />
                        {player.isBot ? "自动准备中..." : "部署中..."}
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 游戏阶段 */}
      {room.status === "playing" && gameState && user && (
        <GamePlayPanel
          roomId={roomId}
          gameState={gameState}
          currentUserId={user.id}
        />
      )}
    </div>
  )
}
