"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GameBoard } from "@/components/game-board"
import { NumberPalette } from "@/components/number-palette"
import { showToast } from "@/components/toaster"
import { 
  createEmptyBoard, 
  getAvailableNumbers, 
  isValidBoard,
  canMoveForward 
} from "@/lib/utils"
import { ArrowLeft, Users, Play, UserX, Crown } from "lucide-react"

interface Player {
  userId: string
  nickname: string
  isReady: boolean
  isActive: boolean
}

interface Room {
  id: string
  creatorId: string
  maxPlayers: number
  status: "waiting" | "playing" | "finished"
}

interface GameState {
  roomStatus: string
  currentRound: number
  currentTurn: number
  turnOrder: string[]
  publicArea: { number: number; playerId: string }[]
  playerBoards: Record<string, { board: Record<string, number | null>; eliminated: number[]; nickname: string }>
  yourTurn: boolean
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; nickname: string } | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  
  // Deployment
  const [myBoard, setMyBoard] = useState(createEmptyBoard())
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null)
  const [isDeployed, setIsDeployed] = useState(false)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const loadRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`)
      if (res.ok) {
        const data = await res.json()
        setRoom(data.room)
        setPlayers(data.players)
      } else {
        showToast("房间不存在", "error")
        router.push("/rooms")
      }
    } catch (error) {
      console.error(error)
    }
  }, [roomId, router])

  const loadGameState = useCallback(async () => {
    if (!room || room.status !== "playing") return
    try {
      const res = await fetch(`/api/rooms/${roomId}/state`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setGameState(data)
      }
    } catch (error) {
      console.error(error)
    }
  }, [room, roomId, token])

  const loadUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setCurrentUser(await res.json())
      }
    } catch (error) {
      console.error(error)
    }
  }, [token])

  useEffect(() => {
    loadRoom()
    loadUser()
    const interval = setInterval(() => {
      loadRoom()
      loadGameState()
    }, 2000)
    return () => clearInterval(interval)
  }, [loadRoom, loadGameState, loadUser])

  const placeNumber = (cellId: string) => {
    if (isDeployed) return
    if (selectedNumber === null) return
    if (myBoard[cellId] !== null) return
    
    setMyBoard(prev => ({ ...prev, [cellId]: selectedNumber }))
    setSelectedNumber(null)
  }

  const clearCell = (cellId: string) => {
    if (isDeployed) return
    setMyBoard(prev => ({ ...prev, [cellId]: null }))
  }

  const submitDeployment = async () => {
    if (!isValidBoard(myBoard)) {
      showToast("请放置所有10个数字", "error")
      return
    }
    try {
      const res = await fetch(`/api/rooms/${roomId}/ready`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ board: myBoard })
      })
      if (res.ok) {
        setIsDeployed(true)
        showToast("部署完成", "success")
      }
    } catch (error) {
      showToast("部署失败", "error")
    }
  }

  const startGame = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        showToast("游戏开始", "success")
        loadRoom()
      } else {
        const data = await res.json()
        showToast(data.error || "开始失败", "error")
      }
    } catch (error) {
      showToast("网络错误", "error")
    }
  }

  const leaveRoom = async () => {
    try {
      await fetch(`/api/rooms/${roomId}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      router.push("/rooms")
    } catch (error) {
      showToast("离开失败", "error")
    }
  }

  const kickPlayer = async (playerId: string) => {
    try {
      await fetch(`/api/rooms/${roomId}/kick/${playerId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      showToast("已踢出玩家", "success")
      loadRoom()
    } catch (error) {
      showToast("踢出失败", "error")
    }
  }

  const isCreator = room?.creatorId === currentUser?.id
  const canStart = isCreator && room?.status === "waiting" && players.length >= 2
  const deployedCount = Object.values(myBoard).filter(v => v !== null).length

  if (!room) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/rooms">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">房间 {room.id}</h1>
          <p className="text-sm text-muted-foreground">
            {room.status === "waiting" ? "等待中" : room.status === "playing" ? "游戏中" : "已结束"}
          </p>
        </div>
        <Button variant="outline" onClick={leaveRoom} className="ml-auto">
          离开
        </Button>
      </div>

      {/* Players */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            玩家 ({players.length}/{room.maxPlayers})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {players.map(player => (
              <div key={player.userId} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold">
                  {player.nickname[0]}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{player.nickname}</div>
                  <div className="text-xs text-muted-foreground">
                    {player.userId === room.creatorId && <Crown className="w-3 h-3 inline mr-1" />}
                    {player.userId === room.creatorId ? "房主" : ""}
                    {player.isReady && " · 已准备"}
                  </div>
                </div>
                {isCreator && player.userId !== currentUser?.id && room.status === "waiting" && (
                  <Button variant="ghost" size="sm" onClick={() => kickPlayer(player.userId)}>
                    <UserX className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {canStart && (
            <Button onClick={startGame} className="w-full mt-4">
              <Play className="w-4 h-4 mr-2" />
              开始游戏
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Deployment */}
      {room.status === "waiting" && (
        <Card>
          <CardHeader>
            <CardTitle>部署阶段 ({deployedCount}/10)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              选择数字后点击格子放置，再次点击已放置的格子可移除
            </p>
            
            <div className="flex justify-center mb-6">
              <GameBoard 
                board={myBoard} 
                onCellClick={(cellId) => myBoard[cellId] === null ? placeNumber(cellId) : clearCell(cellId)}
              />
            </div>
            
            <NumberPalette
              available={getAvailableNumbers(myBoard)}
              selected={selectedNumber}
              onSelect={setSelectedNumber}
              disabled={isDeployed}
            />
            
            {!isDeployed ? (
              <Button 
                onClick={submitDeployment} 
                disabled={deployedCount !== 10} 
                className="w-full mt-6"
              >
                确认部署
              </Button>
            ) : (
              <p className="text-center text-green-500 mt-6">已部署完成，等待游戏开始</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Game */}
      {room.status === "playing" && gameState && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>第 {gameState.currentRound} 回合</span>
              {gameState.yourTurn && (
                <span className="text-sm text-green-500 animate-pulse">你的回合!</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Public Area */}
            <div className="mb-6">
              <h4 className="text-sm text-muted-foreground mb-2">公共区域</h4>
              <div className="flex flex-wrap gap-3 justify-center min-h-[80px] p-4 bg-muted rounded-lg">
                {gameState.publicArea.map((piece, idx) => (
                  <div key={idx} className="public-piece">
                    {piece.number}
                  </div>
                ))}
                {gameState.publicArea.length === 0 && (
                  <span className="text-muted-foreground">空</span>
                )}
              </div>
            </div>

            {/* Player Boards */}
            {Object.entries(gameState.playerBoards).map(([playerId, data]) => (
              <div key={playerId} className="mb-4">
                <h4 className="text-sm text-muted-foreground mb-2">{data.nickname} 的棋盘</h4>
                <GameBoard board={data.board} readonly size="sm" />
                {data.eliminated.length > 0 && (
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">已淘汰: </span>
                    {data.eliminated.join(", ")}
                  </div>
                )}
              </div>
            ))}

            {/* Actions */}
            {gameState.yourTurn && (
              <div className="flex justify-center gap-4 mt-6">
                <Button variant="outline">放弃行动</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}