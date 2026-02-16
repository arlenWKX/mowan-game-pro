"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GameBoard } from "@/components/game-board"
import { RotateCcw, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Board } from "@/types"

interface DeploymentPanelProps {
  /** 当前棋盘状态 */
  board: Board
  /** 已放置的数字数量 */
  deployedCount: number
  /** 是否已完成部署 */
  isComplete: boolean
  /** 下一个要放置的数字 */
  nextNumber: number | null
  /** 点击格子的回调 */
  onCellClick: (cellId: string) => void
  /** 重置棋盘的回调 */
  onReset: () => void
  /** 确认部署的回调 */
  onSubmit: () => void
  /** 是否正在提交 */
  isSubmitting?: boolean
}

/**
 * 部署阶段面板组件
 * 
 * 功能:
 * - 显示棋盘，点击放置数字 0-9
 * - 点击已放置的数字可移除
 * - 显示部署进度
 * - 确认部署按钮
 */
export function DeploymentPanel({
  board,
  deployedCount,
  isComplete,
  nextNumber,
  onCellClick,
  onReset,
  onSubmit,
  isSubmitting = false
}: DeploymentPanelProps) {
  
  // 计算已放置的数字列表
  const placedNumbers = useMemo(() => {
    const result: { num: number; cellId: string }[] = []
    for (const [cellId, value] of Object.entries(board)) {
      if (typeof value === 'number') {
        result.push({ num: value, cellId })
      }
    }
    return result.sort((a, b) => a.num - b.num)
  }, [board])

  return (
    <Card className="overflow-hidden">
      {/* 头部：标题和进度 */}
      <CardHeader className="pb-4 bg-muted/30">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>部署阶段</span>
            {isComplete && (
              <span className="text-green-500">
                <CheckCircle2 className="w-5 h-5" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm px-3 py-1 rounded-full font-medium",
              isComplete 
                ? "bg-green-500/20 text-green-600" 
                : "bg-primary/10 text-primary"
            )}>
              {deployedCount} / 10
            </span>
          </div>
        </CardTitle>
        
        {/* 进度条 */}
        <div className="mt-3">
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${deployedCount * 10}%` }}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* 棋盘区域 */}
        <div className="flex justify-center overflow-x-auto pb-2">
          <GameBoard 
            board={board}
            onCellClick={onCellClick}
            nextNumber={nextNumber}
            size="md"
          />
        </div>
        
        {/* 已放置数字预览 */}
        {placedNumbers.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">已放置的数字</h4>
            <div className="flex flex-wrap gap-2">
              {placedNumbers.map(({ num, cellId }) => (
                <div 
                  key={num}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                >
                  <span>{num}</span>
                  <span className="text-primary-foreground/60 text-xs">@{cellId}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 操作提示 */}
        {!isComplete && nextNumber !== null && (
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-lg text-blue-600">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">部署提示</p>
              <p className="text-blue-600/80 mt-0.5">
                点击任意空格放置数字 <span className="font-bold">{nextNumber}</span>。
                如果想更换位置，点击已放置的数字即可移除。
              </p>
            </div>
          </div>
        )}
        
        {/* 操作按钮 */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onReset}
            disabled={deployedCount === 0 || isSubmitting}
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            重置
          </Button>
          
          <Button
            onClick={onSubmit}
            disabled={!isComplete || isSubmitting}
            className="flex-[2]"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                确认部署
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
