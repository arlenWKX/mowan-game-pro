"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Users, LogIn } from "lucide-react"
import { showToast } from "@/components/toaster"

export default function RoomsPage() {
  const router = useRouter()
  const [joinRoomId, setJoinRoomId] = useState("")
  const [maxPlayers, setMaxPlayers] = useState(2)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const createRoom = async () => {
    setCreating(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ max_players: maxPlayers })
      })

      const data = await res.json()
      if (res.ok) {
        showToast("房间创建成功", "success")
        router.push(`/room/${data.room_id}`)
      } else {
        showToast(data.error || "创建失败", "error")
      }
    } catch (error) {
      showToast("网络错误", "error")
    } finally {
      setCreating(false)
      setDialogOpen(false)
    }
  }

  const joinRoom = async () => {
    if (!joinRoomId.trim()) {
      showToast("请输入房间ID", "error")
      return
    }

    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/rooms/${joinRoomId}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        router.push(`/room/${joinRoomId}`)
      } else {
        const data = await res.json()
        showToast(data.error || "加入失败", "error")
      }
    } catch (error) {
      showToast("网络错误", "error")
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">游戏房间</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
                >
                  <option value={2}>2人</option>
                  <option value={3}>3人</option>
                  <option value={4}>4人</option>
                  <option value={5}>5人</option>
                </select>
              </div>
              <Button onClick={createRoom} disabled={creating} className="w-full">
                {creating ? "创建中..." : "创建"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>加入房间</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              placeholder="输入4位房间ID"
              maxLength={4}
              className="uppercase"
            />
            <Button onClick={joinRoom}>
              <LogIn className="w-4 h-4 mr-2" />
              加入
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-muted-foreground">
        <p>输入房间ID或创建新房间开始游戏</p>
        <p className="text-sm mt-2">房间ID为4位字母数字组合</p>
      </div>
    </div>
  )
}