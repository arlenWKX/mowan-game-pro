"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { showToast } from "@/components/toaster"
import { useAuth } from "@/hooks"
import { Plus, Users, LogIn, Loader2, Crown, RefreshCw, DoorOpen, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Room {
  id: string
  creatorId: string
  maxPlayers: number
  status: 'waiting' | 'playing' | 'finished'
  currentRound: number
  createdAt: string
  players?: Array<{ userId: string; nickname: string }>
}

export default function RoomsPage() {
  const router = useRouter()
  const { token, user, isLoading: isAuthLoading } = useAuth()
  const [joinRoomId, setJoinRoomId] = useState("")
  const [maxPlayers, setMaxPlayers] = useState(2)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  
  // My rooms state
  const [myRooms, setMyRooms] = useState<Room[]>([])
  const [loadingMyRooms, setLoadingMyRooms] = useState(false)

  // Fetch my rooms
  const fetchMyRooms = useCallback(async () => {
    if (!token) return
    setLoadingMyRooms(true)
    try {
      const res = await fetch("/api/rooms?my=1", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setMyRooms(data.data.rooms || [])
        }
      }
    } catch (error) {
      console.error("Failed to fetch my rooms:", error)
    } finally {
      setLoadingMyRooms(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchMyRooms()
    }
  }, [token, fetchMyRooms])

  const createRoom = async () => {
    if (isAuthLoading) {
      showToast("加载中，请稍后", "info")
      return
    }
    if (!token) {
      showToast("请先登录", "error")
      router.push("/login")
      return
    }

    setCreating(true)
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ max_players: maxPlayers })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        showToast(data.message || "房间创建成功", "success")
        router.push(`/room/${data.data.room_id}`)
      } else {
        showToast(data.error || "创建失败", "error")
      }
    } catch (error) {
      showToast("网络错误，请稍后重试", "error")
    } finally {
      setCreating(false)
      setDialogOpen(false)
    }
  }

  const joinRoom = async () => {
    if (isAuthLoading) {
      showToast("加载中，请稍后", "info")
      return
    }
    if (!token) {
      showToast("请先登录", "error")
      router.push("/login")
      return
    }

    if (!joinRoomId.trim()) {
      showToast("请输入房间ID", "error")
      return
    }

    setJoining(true)
    try {
      const res = await fetch(`/api/rooms/${joinRoomId}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await res.json()
      
      if (res.ok && data.success) {
        showToast(data.message || "加入成功", "success")
        router.push(`/room/${joinRoomId}`)
      } else {
        showToast(data.error || "加入失败", "error")
      }
    } catch (error) {
      showToast("网络错误，请稍后重试", "error")
    } finally {
      setJoining(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      joinRoom()
    }
  }

  const getStatusBadge = (status: Room['status']) => {
    const styles = {
      waiting: "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30",
      playing: "bg-green-500/20 text-green-500 hover:bg-green-500/30",
      finished: "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
    }
    const labels = {
      waiting: "等待中",
      playing: "游戏中",
      finished: "已结束"
    }
    return (
      <Badge variant="secondary" className={cn("font-normal", styles[status])}>
        {labels[status]}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* My Rooms Section */}
      {token && myRooms.length > 0 && (
        <Card className="mb-6 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                我创建的房间
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchMyRooms}
                disabled={loadingMyRooms}
              >
                <RefreshCw className={cn("w-4 h-4", loadingMyRooms && "animate-spin")} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myRooms.map(room => (
                <div 
                  key={room.id}
                  onClick={() => router.push(`/room/${room.id}`)}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-mono font-bold text-primary">
                      {room.id}
                    </div>
                    <div>
                      <div className="font-medium">房间 {room.id}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {room.maxPlayers}人
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(room.status)}
                    <DoorOpen className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">游戏房间</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              创建房间
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建房间</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">玩家人数</label>
                <select
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                  disabled={creating}
                >
                  <option value={2}>2人</option>
                  <option value={3}>3人</option>
                  <option value={4}>4人</option>
                  <option value={5}>5人</option>
                </select>
              </div>
              <Button 
                onClick={createRoom} 
                disabled={creating || isAuthLoading} 
                className="w-full"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "创建"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Join Room Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            加入房间
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="输入4位房间ID"
              maxLength={4}
              className="uppercase flex-1"
              disabled={joining}
            />
            <Button 
              onClick={joinRoom} 
              disabled={joining || isAuthLoading || !joinRoomId.trim()}
              className="w-full sm:w-auto"
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  加入中...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  加入
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer Links */}
      <div className="mt-8 text-center text-muted-foreground space-y-2">
        <p>输入房间ID或创建新房间开始游戏</p>
        <p className="text-sm">房间ID为4位字母数字组合</p>
        <div className="flex justify-center gap-4 mt-4">
          <Link href="/offline">
            <Button variant="outline" size="sm">
              离线练习
            </Button>
          </Link>
          <Link href="/rules">
            <Button variant="outline" size="sm">
              游戏规则
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
