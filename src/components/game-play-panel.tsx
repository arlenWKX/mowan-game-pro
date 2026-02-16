"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GameBoard } from "@/components/game-board"
import { Bot, User, ArrowUp, Swords, CheckCircle2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GameStateResponse, Board, GameAction } from "@/types"
import { useGameActions } from "@/hooks/useGameActions"

interface GamePlayPanelProps {
  /** 房间ID */
  roomId: string
  /** 游戏状态 */
  gameState: GameStateResponse
  /** 当前用户ID */
  currentUserId: string
}

/**
 * 游戏进行面板组件
 * 
 * 游戏规则理解:
 * - 一个"回合"包含所有玩家的行动
 * - 玩家按照 turnOrder 顺序依次行动
 * - 所有玩家行动完成后，进入结算阶段
 * - 结算后根据公共区域情况决定是否触发额外回合
 */
export function GamePlayPanel({
  roomId,
  gameState,
  currentUserId
}: GamePlayPanelProps) {
  const { 
    currentRound, 
    publicArea, 
    playerBoards, 
    currentPlayerNickname,
    currentPlayerId,
    yourTurn,
    hasActed,
    actedPlayers,
    needsSettlement,
    turnOrder
  } = gameState

  // 获取当前玩家棋盘
  const myBoard = playerBoards[currentUserId]
  
  // 游戏操作逻辑
  const {
    selectedCell,
    selectedNumber,
    canAdvance,
    movableCells,
    selectCell,
    clearSelection,
    advance
  } = useGameActions({
    myBoard: myBoard?.board as Board || {},
    myUserId: currentUserId,
    currentTurn: gameState.currentTurn,
    turnOrder: gameState.turnOrder,
    publicArea,
    isMyTurn: yourTurn && !hasActed, // 只有是当前回合且未行动时才能操作
    roomId
  })

  // 获取玩家状态
  const getPlayerStatus = (playerId: string) => {
    const isCurrentTurn = playerId === currentPlayerId
    const hasPlayerActed = actedPlayers.includes(playerId)
    
    if (hasPlayerActed) return { label: '已行动', color: 'bg-green-500/20 text-green-600' }
    if (isCurrentTurn) return { label: '行动中', color: 'bg-yellow-500/20 text-yellow-600' }
    return { label: '等待中', color: 'bg-gray-500/20 text-gray-500' }
  }

  // 隐藏其他玩家的棋盘数字，只显示占用状态
  const hideOtherPlayerBoard = (board: Record<string, number | null | string>): Record<string, number | null | string> => {
    const hiddenBoard: Record<string, number | null | string> = {}
    for (const [cellId, value] of Object.entries(board)) {
      if (value === null || value === undefined) {
        hiddenBoard[cellId] = null
      } else if (typeof value === 'number') {
        // 只显示占用状态，不显示具体数字
        hiddenBoard[cellId] = "occupied"
      } else {
        hiddenBoard[cellId] = value
      }
    }
    return hiddenBoard
  }

  // 处理前进操作
  const handleAdvance = async () => {
    if (!canAdvance || !selectedCell) return
    await advance()
  }

  return (
    <div className="space-y-4">
      {/* 回合信息 */}
      <Card className={cn(
        "border-l-4",
        needsSettlement 
          ? "border-l-purple-500 bg-purple-500/5" 
          : yourTurn && !hasActed
            ? "border-l-green-500 bg-green-500/5"
            : "border-l-gray-300"
      )}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">第 {currentRound} 回合</p>
                {needsSettlement && (
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-600">
                    结算中
                  </Badge>
                )}
                {hasActed && (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    已行动
                  </Badge>
                )}
              </div>
              <p className="text-lg font-bold mt-0.5">
                {needsSettlement ? (
                  <span className="text-purple-600">回合结束，结算中...</span>
                ) : yourTurn ? (
                  hasActed ? (
                    <span className="text-green-600">已行动，等待其他玩家...</span>
                  ) : (
                    <span className="text-green-600">轮到你了！请选择行动</span>
                  )
                ) : (
                  <span>等待 {currentPlayerNickname} 行动</span>
                )}
              </p>
            </div>
          </div>
          
          {/* 玩家行动状态 */}
          <div className="mt-4 flex flex-wrap gap-2">
            {turnOrder.map((playerId, idx) => {
              const player = playerBoards[playerId]
              if (!player) return null
              const status = getPlayerStatus(playerId)
              const isMe = playerId === currentUserId
              
              return (
                <div 
                  key={playerId}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm",
                    status.color
                  )}
                >
                  <span className="font-medium">{player.nickname}{isMe ? "(你)" : ""}</span>
                  <span className="text-xs opacity-75">{status.label}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 公共区域 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary">
              <Swords className="w-4 h-4" />
            </span>
            公共区域
          </CardTitle>
        </CardHeader>
        <CardContent>
          {publicArea.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>暂无棋子</p>
              <p className="text-sm mt-1">将棋子移动到公共区域进行对决</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 justify-center p-4 bg-muted/30 rounded-lg">
              {publicArea.map((piece, idx) => (
                <div 
                  key={idx}
                  className="relative group"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shadow-md">
                    {piece.number}
                  </div>
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {piece.nickname}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 我的棋盘 */}
      {myBoard && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary">
                <User className="w-4 h-4" />
              </span>
              我的棋盘
              {selectedCell && (
                <Badge className="ml-2 bg-yellow-500/20 text-yellow-600">
                  选中: {selectedCell} ({selectedNumber})
                </Badge>
              )}
              {myBoard.eliminated.length > 0 && (
                <span className="text-sm text-muted-foreground ml-auto">
                  已淘汰: {myBoard.eliminated.join(", ")}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <GameBoard 
                board={myBoard.board}
                onCellClick={yourTurn && !hasActed ? selectCell : undefined}
                selectedCell={selectedCell}
                movableCells={movableCells}
                readonly={!yourTurn || hasActed}
                size="md"
              />
            </div>
            
            {/* 操作按钮 - 只有当前回合且未行动时显示 */}
            {yourTurn && !hasActed && !needsSettlement && (
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  disabled={!selectedCell}
                  className="flex-1"
                >
                  取消选择
                </Button>
                <Button
                  onClick={handleAdvance}
                  disabled={!canAdvance}
                  className="flex-[2]"
                >
                  <ArrowUp className="w-4 h-4 mr-2" />
                  前进
                </Button>
              </div>
            )}
            
            {/* 已行动提示 */}
            {hasActed && (
              <div className="mt-4 p-3 bg-green-500/10 rounded-lg text-center text-green-600">
                <CheckCircle2 className="w-5 h-5 inline mr-2" />
                你已行动，等待其他玩家...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 其他玩家棋盘 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(playerBoards)
          .filter(([playerId]) => playerId !== currentUserId)
          .map(([playerId, data]) => {
            const status = getPlayerStatus(playerId)
            return (
              <Card key={playerId} className="overflow-hidden">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {data.isBot ? (
                      <Bot className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="truncate">{data.nickname}</span>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded ml-auto", status.color)}>
                      {status.label}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <div className="flex justify-center">
                    <GameBoard 
                      board={hideOtherPlayerBoard(data.board)}
                      readonly
                      size="sm"
                      showLabels={false}
                    />
                  </div>
                  {data.eliminated.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground text-center">
                      已淘汰: {data.eliminated.join(", ")}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
      </div>
    </div>
  )
}
