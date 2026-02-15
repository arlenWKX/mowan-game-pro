"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GameBoard } from "@/components/game-board"
import { NumberPalette } from "@/components/number-palette"
import { createEmptyBoard, getAvailableNumbers, isValidBoard } from "@/lib/utils"
import { ArrowLeft, BookOpen, Gamepad2 } from "lucide-react"

export default function OfflinePage() {
  const [showTutorial, setShowTutorial] = useState(true)
  const [myBoard, setMyBoard] = useState(createEmptyBoard())
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null)

  const placeNumber = (cellId: string) => {
    if (selectedNumber === null) return
    if (myBoard[cellId] !== null) return
    setMyBoard(prev => ({ ...prev, [cellId]: selectedNumber }))
    setSelectedNumber(null)
  }

  const clearCell = (cellId: string) => {
    setMyBoard(prev => ({ ...prev, [cellId]: null }))
  }

  const deployedCount = Object.values(myBoard).filter(v => v !== null).length

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">离线模式 - 新手教学</h1>
      </div>

      {showTutorial ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              欢迎来到魔丸小游戏！
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">在离线模式中，你可以：</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>练习数字部署</li>
              <li>熟悉棋盘布局</li>
              <li>了解游戏规则</li>
            </ul>
            <Button onClick={() => setShowTutorial(false)} className="w-full">
              <Gamepad2 className="w-4 h-4 mr-2" />
              开始练习
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>部署练习 ({deployedCount}/10)</CardTitle>
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
            />
            
            <Card className="mt-6 bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm">对决规则速查</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 相同数字 → 同归于尽</li>
                  <li>• 0 vs 6/9 → 同归于尽</li>
                  <li>• 8 &gt; 0</li>
                  <li>• 其他情况：小数字获胜！(0 &gt; 1 &gt; 2 &gt; ... &gt; 9)</li>
                </ul>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}
    </div>
  )
}