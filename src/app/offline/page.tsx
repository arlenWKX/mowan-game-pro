"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GameBoard } from "@/components/game-board"
import { useDeployment } from "@/hooks"
import { ArrowLeft, BookOpen, Gamepad2, RotateCcw, CheckCircle, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export default function OfflinePage() {
  const [showTutorial, setShowTutorial] = useState(true)
  const [showComplete, setShowComplete] = useState(false)
  const deployment = useDeployment()

  const handleComplete = () => {
    if (deployment.isComplete) {
      setShowComplete(true)
    }
  }

  const restart = () => {
    deployment.reset()
    setShowComplete(false)
  }

  if (showTutorial) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold">离线模式</h1>
        </div>

        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">欢迎来到魔丸小游戏！</h2>
            <p className="text-muted-foreground mb-6">在离线模式中，你可以自由练习部署数字</p>
            
            <div className="grid sm:grid-cols-3 gap-4 text-left mb-8">
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium mb-1">练习部署</div>
                <div className="text-sm text-muted-foreground">熟悉棋盘布局和操作流程</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium mb-1">了解规则</div>
                <div className="text-sm text-muted-foreground">0吃6/9，8吃0，小数胜大数</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium mb-1">准备实战</div>
                <div className="text-sm text-muted-foreground">熟练后再与其他玩家对战</div>
              </div>
            </div>

            <Button onClick={() => setShowTutorial(false)} className="w-full sm:w-auto px-8">
              <Gamepad2 className="w-4 h-4 mr-2" />
              开始练习
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showComplete) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold">部署完成</h1>
        </div>

        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">练习完成！</h2>
            <p className="text-muted-foreground mb-6">你已经成功部署了所有数字</p>
            
            <div className="flex justify-center mb-8">
              <GameBoard board={deployment.board} readonly size="lg" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={restart}>
                <RotateCcw className="w-4 h-4 mr-2" />
                重新练习
              </Button>
              <Link href="/rooms">
                <Button>
                  <Sparkles className="w-4 h-4 mr-2" />
                  开始对战
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold">部署练习</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>放置数字</span>
            <span className={cn(
              "text-sm px-3 py-1 rounded-full",
              deployment.isComplete 
                ? "bg-green-500/20 text-green-500" 
                : "bg-muted text-muted-foreground"
            )}>
              {deployment.deployedCount}/10
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${deployment.deployedCount * 10}%` }}
            />
          </div>
          
          {/* Game Board - New simplified interaction */}
          <div className="flex justify-center overflow-x-auto">
            <GameBoard 
              board={deployment.board} 
              onCellClick={deployment.handleCellClick}
              nextNumber={deployment.nextNumber}
            />
          </div>
          
          {/* Number placement guide */}
          {deployment.nextNumber !== null && (
            <div className="text-center text-sm text-muted-foreground">
              点击任意格子放置数字 <span className="font-bold text-primary">{deployment.nextNumber}</span>，
              点击已放置的数字可以移除
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={deployment.reset}
              disabled={deployment.deployedCount === 0}
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              重置
            </Button>
            <Button 
              onClick={handleComplete} 
              disabled={!deployment.isComplete} 
              className="flex-[2]"
            >
              完成练习
            </Button>
          </div>

          {/* Tips */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">对决规则速查</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 相同数字 → 同归于尽</li>
                <li>• 0 vs 6/9 → 同归于尽（0克制6和9）</li>
                <li>• 8 &gt; 0（8专门克制0）</li>
                <li>• 其他情况：小数字获胜！0 &gt; 1 &gt; 2 &gt; ... &gt; 9</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
